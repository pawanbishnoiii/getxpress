import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser as requireSupabaseAuth } from "@/lib/auth-guard";
import { couponDiscount, quote, serviceAllowed, type ServiceLevel, type ServiceRates } from "./pricing";
import { shippingDeclaration } from './shipping-safety';

const party = {
  name: z.string().trim().min(2).max(100),
  phone: z.preprocess((v) => String(v ?? "").replace(/\D/g, "").slice(-10), z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
  alternate_phone:z.preprocess((v) => String(v ?? "").replace(/\D/g, "").slice(-10), z.string().regex(/^$|^[6-9]\d{9}$/, "Check the alternate mobile number")).default(""),
  country:z.literal("India").default("India"),
  address: z.string().trim().min(8).max(400),
  pincode: z.string().regex(/^\d{6}$/),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().max(80).default(""),
  district: z.string().trim().max(80).default(""),
  email: z.string().max(255).refine(v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
};

const input = z.object({
  service: z.enum(["standard", "express", "same_day"]),
  sender: z.object(party),
  receiver: z.object(party),
  billing_same_as_delivery:z.boolean().default(true),
  billing:z.object(party).optional(),
  pieces: z.array(z.object({ weight_kg: z.number().min(0.05).max(100), dims: z.object({l:z.number().min(1).max(300),w:z.number().min(1).max(300),h:z.number().min(1).max(300)}).optional(), box_preset:z.string().max(40).optional() })).min(1).max(50),
  contents: shippingDeclaration.shape.contents,
  policy_accepted: shippingDeclaration.shape.policy_accepted,
  declared_value: z.number().min(0).max(1_000_000).default(0),
  payment_method: z.enum(["cash_on_pickup", "online", "wallet"]).default("cash_on_pickup"),
  booking_otp: z.string().regex(/^$|^\d{6}$/, "Enter the 6-digit confirmation code").default(""),
  coupon_code: z.string().trim().toUpperCase().max(30).optional(),
  pickup: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  dims: z.object({ l: z.number().min(1).max(300), w: z.number().min(1).max(300), h: z.number().min(1).max(300) }).optional(),
  is_fragile: z.boolean().default(false),
  has_electronics: z.boolean().default(false),
  photos: z.array(z.string().max(300).regex(/^[0-9a-f-]+\/[\w.-]+$/)).max(3).default([]),
});

async function resolveCoupon(code: string, userId: string, total: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: c } = await supabaseAdmin.from("coupons").select("*").eq("code", code).maybeSingle();
  const now = Date.now();
  if (!c || !c.active || new Date(c.starts_at).getTime() > now || (c.expires_at && new Date(c.expires_at).getTime() < now)) throw new Error("Coupon is invalid or expired.");
  if (c.max_uses != null && c.used_count >= c.max_uses) throw new Error("Coupon usage limit reached.");
  const { count } = await supabaseAdmin.from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", c.id).eq("user_id", userId);
  if ((count ?? 0) >= c.per_user_limit) throw new Error("You have already used this coupon.");
  const d = couponDiscount(total, { discount_type: c.discount_type, discount_value: Number(c.discount_value), max_discount: c.max_discount == null ? null : Number(c.max_discount), min_order: Number(c.min_order) });
  if (d <= 0) throw new Error(`Minimum order ₹${c.min_order} for this coupon.`);
  return { coupon: c, discount: d };
}

/** Preview a coupon against a server-computed quote. */
export const previewCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; total: number }) => z.object({ code: z.string().trim().toUpperCase().min(2).max(30), total: z.number().min(0).max(1e7) }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await resolveCoupon(data.code, context.userId, data.total);
    return { code: r.coupon.code, discount: r.discount, description: r.coupon.description };
  });

/** Signed-out preview: validity + minimum order only; per-user limits are re-checked at booking. */
export const previewCouponPublic = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; total: number }) => z.object({ code: z.string().trim().toUpperCase().min(2).max(30), total: z.number().min(0).max(1e7) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("coupons").select("code,description,active,starts_at,expires_at,max_uses,used_count,discount_type,discount_value,max_discount,min_order").eq("code", data.code).maybeSingle();
    const now = Date.now();
    if (!c || !c.active || new Date(c.starts_at).getTime() > now || (c.expires_at && new Date(c.expires_at).getTime() < now)) throw new Error("Coupon is invalid or expired.");
    if (c.max_uses != null && c.used_count >= c.max_uses) throw new Error("Coupon usage limit reached.");
    const d = couponDiscount(data.total, { discount_type: c.discount_type, discount_value: Number(c.discount_value), max_discount: c.max_discount == null ? null : Number(c.max_discount), min_order: Number(c.min_order) });
    if (d <= 0) throw new Error(`Minimum order ₹${c.min_order} for this coupon.`);
    return { code: c.code, discount: d, description: c.description };
  });

export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof input>) => input.parse(d))
  .handler(async ({ data, context }) => {
    if(!data.billing_same_as_delivery&&!data.billing)throw new Error("Enter billing details");
    const sb = context.supabase;
    const { data: profile } = await sb.from("profiles").select("phone_verified").eq("id", context.userId).maybeSingle();
    // Staff (hubs, managers, admin) are created and verified by an admin, so they book without OTP.
    const { data: staff } = await sb.rpc("is_staff", { _u: context.userId });
    if (!staff && !profile?.phone_verified) throw new Error("Verify your mobile number before booking.");
    const verifyBookingOtp = async () => {
      // Every booking is confirmed with a one-time code sent to the account's mobile.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: otp } = await supabaseAdmin.from("phone_otps").select("*").eq("user_id", context.userId).is("consumed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!otp || new Date(otp.expires_at) < new Date()) throw new Error("Confirmation code expired. Request a new one.");
      if (otp.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${context.userId}:${data.booking_otp}`));
      const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (hash !== otp.code_hash) { await supabaseAdmin.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id); throw new Error("Incorrect confirmation code."); }
      await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
    };

    // Pincodes: master list first; unknown real pincodes are verified with India Post and auto-added.
    const { data: pins } = await sb.from("pincodes").select("pincode,city,state,zone,active").in("pincode", [data.sender.pincode, data.receiver.pincode]);
    const resolvePin = async (pin: string) => {
      const row = pins?.find((p) => p.pincode === pin); if (row) return row;
      const { postalLookup } = await import("./postal"); const p = await postalLookup(pin); if (!p) return null;
      const fresh = { pincode: pin, city: p.city, state: p.state, zone: p.district, active: true };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("pincodes").upsert(fresh, { onConflict: "pincode", ignoreDuplicates: true });
      return fresh;
    };
    const [from, to] = await Promise.all([resolvePin(data.sender.pincode), resolvePin(data.receiver.pincode)]);
    if (!from?.active) throw new Error(`Pickup pincode ${data.sender.pincode} could not be found. Please check it.`);
    if (!to?.active) throw new Error(`Delivery pincode ${data.receiver.pincode} could not be found. Please check it.`);

    // The PIN directory is the source of truth for state; correct user-picked values instead of rejecting the booking.
    data.sender.state = from.state || data.sender.state; data.receiver.state = to.state || data.receiver.state;
    data.sender.district ||= from.zone ?? ""; data.receiver.district ||= to.zone ?? "";

    // Missing rate/setting rows fall back to the defaults in pricing.ts and pay-at-pickup enabled.
    const [{data:rateRows,error:rateError},{data:settings,error:settingsError}] = await Promise.all([sb.from("service_rates").select("*"),sb.from("app_settings").select("cash_on_pickup").eq("id",true).maybeSingle()]);
    if(rateError || settingsError) throw new Error("Delivery settings could not be loaded.");
    const rates:ServiceRates={}; for(const r of rateRows??[]) rates[r.service as ServiceLevel]={base:Number(r.base),perKg:Number(r.per_kg),active:r.active};
    // Team (state) prices set by the pickup state's managers override the national rate.
      const { data: teamRows } = await sb.from("state_rates").select("*").eq("state", from.state);
    for (const r of teamRows ?? []) rates[r.service as ServiceLevel] = { base: Number(r.base), perKg: Number(r.per_kg), active: r.active };
    if(!serviceAllowed(data.service,data.sender.city,data.receiver.city,rates)) throw new Error("This service is unavailable for the selected cities.");
    if(data.payment_method==="cash_on_pickup" && settings && !settings.cash_on_pickup) throw new Error("Pay at pickup is currently disabled.");
    const totalKg = data.pieces.reduce((a, p) => a + p.weight_kg, 0);
    const { handlingFee, presetsFromRows } = await import("./parcel-presets");
    const { data: presetRows } = await sb.from("parcel_presets").select("*");
    const presets = presetsFromRows(presetRows);
    for (const p of data.pieces) { const pr = presets.find((x) => x.id === p.box_preset && x.active); if (pr && pr.max_kg > 0 && p.weight_kg > pr.max_kg) throw new Error(`${pr.label} allows up to ${pr.max_kg} kg. Choose a bigger size.`); }
    const handling = handlingFee(data.pieces.map((p) => ({ preset: p.box_preset ?? "" })), presets, { fragile: data.is_fragile, electronics: data.has_electronics });
    const q = quote({ extras: handling, fromPin: data.sender.pincode, toPin: data.receiver.pincode, weightKg: totalKg, service: data.service, pieces:data.pieces.map(p=>({...p,dims:p.dims??data.dims})), rates });
    const cp = data.coupon_code ? await resolveCoupon(data.coupon_code, context.userId, q.total) : null;
    const payable = Math.round((q.total - (cp?.discount ?? 0)) * 100) / 100;

    // Routing snapshot: origin Point owning the pickup pincode at booking time (never silently changed later)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: alloc } = await supabaseAdmin.from("pincode_allocations").select("holder_user_id").eq("pincode", data.sender.pincode).eq("holder_role", "point").eq("status", "active").maybeSingle();
    let originPoint: string | null = null;
    if (alloc) {
      const { data: sc } = await supabaseAdmin.from("staff_scopes").select("point_id").eq("user_id", alloc.holder_user_id).eq("role", "point").is("revoked_at", null).not("point_id", "is", null).limit(1).maybeSingle();
      originPoint = sc?.point_id ?? null;
    }

    const { data: awb, error: awbErr } = await sb.rpc("next_awb");
    if (awbErr || !awb) throw new Error("Could not allocate AWB.");
    const online = data.payment_method === "online";
    const wallet = data.payment_method === "wallet";
    if (wallet) {
      // Friendly early check; the database re-checks the balance under a lock when the booking is saved.
      const { data: bal } = await sb.rpc("wallet_balance", { _user: context.userId });
      if (Number(bal ?? 0) < payable) throw new Error(`Wallet balance ₹${Number(bal ?? 0).toFixed(2)} is less than ₹${payable.toFixed(2)}. Add money or pick another payment.`);
    }
    if (!staff) await verifyBookingOtp();
    const { data: row, error } = await sb.from("shipments").insert({
      tracking_number: awb,
      user_id: context.userId,
      service: data.service,
      sender_name: data.sender.name, sender_phone: data.sender.phone, sender_address: data.sender.address, sender_pincode: data.sender.pincode, sender_city: data.sender.city,
      receiver_name: data.receiver.name, receiver_phone: data.receiver.phone, receiver_address: data.receiver.address, receiver_pincode: data.receiver.pincode, receiver_city: data.receiver.city,
      weight_kg: q.weight, contents: data.contents ?? null, declared_value: data.declared_value, price: payable,
      coupon_code: cp?.coupon.code ?? null, discount: cp?.discount ?? 0,
      pickup_lat: data.pickup?.lat ?? null, pickup_lng: data.pickup?.lng ?? null, dims: data.dims ?? null,
      sender_state:data.sender.state, receiver_state:data.receiver.state, sender_district:data.sender.district, receiver_district:data.receiver.district, sender_email:data.sender.email||null, receiver_email:data.receiver.email||null, policy_accepted_at:new Date().toISOString(),
      pieces_count: data.pieces.length, is_fragile: data.is_fragile, has_electronics: data.has_electronics, handling_fee: handling,
      payment_method: data.payment_method, parcel_photos: data.photos,
      payment_status: wallet ? "paid" : "pending",
      status: online ? "awaiting_payment" : "booked",
      origin_point_id: originPoint,
      routing_snapshot: { contacts:{sender_alternate_phone:data.sender.alternate_phone,receiver_alternate_phone:data.receiver.alternate_phone}, billing_same_as_delivery:data.billing_same_as_delivery,billing:data.billing_same_as_delivery?data.receiver:data.billing??null,country:"India", origin_state: from.state, origin_zone: from.zone, dest_state: to.state, dest_zone: to.zone, origin_point_user: alloc?.holder_user_id ?? null, quote: q },
    }).select("id, tracking_number, price, status").single();
    if (error) throw new Error(/insufficient wallet/i.test(error.message) ? "Wallet balance is too low for this booking. Add money or pick another payment." : error.message);
    if (cp) {
      await supabaseAdmin.from("coupon_redemptions").insert({ coupon_id: cp.coupon.id, user_id: context.userId, shipment_id: row.id, discount: cp.discount });
      await supabaseAdmin.from("coupons").update({ used_count: cp.coupon.used_count + 1 }).eq("id", cp.coupon.id);
    }

    const pieceRows = [];
    for (const [i, p] of data.pieces.entries()) {
      const { data: code } = await sb.rpc("next_piece_code");
      if (!code) throw new Error("Could not allocate piece ID.");
      pieceRows.push({ shipment_id: row.id, piece_code: code, seq_no: i + 1, total: data.pieces.length, weight_kg: p.weight_kg, contents: data.contents ?? null, dims:p.dims??data.dims??null,box_preset:p.box_preset??null });
    }
    const { error: pErr } = await sb.from("shipment_pieces").insert(pieceRows);
    if (pErr) throw new Error(pErr.message);
    await sb.from("tracking_events").insert({ shipment_id: row.id, status: row.status, location: data.sender.city, note: online ? "Awaiting online payment" : "Pickup requested" });
    const whatsapp = await notifyBooking({ id: row.id, awb: row.tracking_number, price: payable, sender: data.sender, receiver: data.receiver, fromCity: data.sender.city, toCity: data.receiver.city, pieces: data.pieces.length, userId: context.userId });
    try {
      const { sendTemplate } = await import("./email.functions");
      const link = `${new URL(getRequest().url).origin}/track?awb=${row.tracking_number}`;
      for (const p of [data.sender, data.receiver]) if (p.email) await sendTemplate("booking_confirmed", p.email, { name: p.name, tracking: row.tracking_number, link });
    } catch (e) { console.error("booking email failed", e); }
    return { ...row, bill: { ...q, discount: cp?.discount ?? 0, payable, coupon: cp?.coupon.code ?? null }, whatsapp };
  });

/** Online payment gateway is not configured yet; customers can switch to pay-at-pickup. */
export const switchToCashOnPickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { awb: string }) => z.object({ awb: z.string().max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const {data:settings,error:settingsError}=await context.supabase.from("app_settings").select("cash_on_pickup").eq("id",true).single();
    if(settingsError||!settings.cash_on_pickup) throw new Error("Pay at pickup is currently disabled.");
    const { data: s } = await context.supabase.from("shipments").select("id,status,user_id").eq("tracking_number", data.awb).maybeSingle();
    if (!s || s.user_id !== context.userId) throw new Error("Shipment not found.");
    if (s.status !== "awaiting_payment") throw new Error("This booking is already confirmed.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("shipments").update({ payment_method: "cash_on_pickup", status: "booked", updated_at: new Date().toISOString() }).eq("id", s.id);
    await supabaseAdmin.from("tracking_events").insert({ shipment_id: s.id, status: "booked", note: "Confirmed with pay at pickup" });
    return { ok: true };
  });

/** Find a user by email so staff can grant a role. Role check happens in the grant_staff_role DB function. */
export const grantRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: string; state?: string; point_id?: string }) =>
    z.object({ email: z.string().email().max(255), role: z.enum(["admin", "state_director", "state_manager", "area_manager", "network", "point"]), state: z.string().max(80).optional(), point_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: mine } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!mine?.length) throw new Error("Staff only.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let found: string | null = null;
    for (let page = 1; page <= 20 && !found; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      found = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase())?.id ?? null;
      if (!list || list.users.length < 200) break;
    }
    if (!found) throw new Error("No account with that email. Ask them to sign in once first.");
    const { error } = await context.supabase.rpc("grant_staff_role", { _user_id: found, _role: data.role, ...(data.state ? { _state: data.state } : {}), ...(data.point_id ? { _point_id: data.point_id } : {}) });
    if (error) throw new Error(error.message);
    return { user_id: found };
  });

/**
 * Razorpay DEMO mode: no real money moves. Records a demo payment and confirms the booking.
 * Replace with real order creation + signature verification once RAZORPAY keys are added.
 */
export const demoPay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { shipmentId: string; method: string; outcome: "success" | "failure" }) =>
    z.object({ shipmentId: z.string().uuid(), method: z.enum(["upi", "card", "netbanking", "wallet"]), outcome: z.enum(["success", "failure"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s } = await context.supabase.from("shipments").select("id,status,user_id,price").eq("id", data.shipmentId).maybeSingle();
    if (!s || s.user_id !== context.userId) throw new Error("Shipment not found.");
    if (s.status !== "awaiting_payment") throw new Error("This booking is not awaiting payment.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ref = "pay_demo_" + crypto.randomUUID().replaceAll("-", "").slice(0, 14);
    const ok = data.outcome === "success";
    await supabaseAdmin.from("payments").insert({ shipment_id: s.id, user_id: context.userId, amount: s.price, method: data.method, provider_ref: ref, status: ok ? "captured" : "failed" });
    if (!ok) return { ok: false, ref };
    await supabaseAdmin.from("shipments").update({ status: "booked", payment_status: "paid_demo", updated_at: new Date().toISOString() }).eq("id", s.id);
    await supabaseAdmin.from("tracking_events").insert({ shipment_id: s.id, status: "booked", note: `Demo payment ${ref} captured` });
    return { ok: true, ref };
  });

/** Booking alerts on WhatsApp to sender and receiver, with tracking code and link. Logged in notifications either way. */
async function notifyBooking(b: { id: string; awb: string; price: number; sender: { name: string; phone: string }; receiver: { name: string; phone: string }; fromCity: string; toCity: string; pieces: number; userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendWhatsapp } = await import("./whatsapp.server");
  const { publicBaseUrl, brand } = await import("./brand");
  const link = `${publicBaseUrl()}/track?id=${encodeURIComponent(b.awb)}`;
  const msgs = [
    { to: b.sender.phone, role: "sender", text: `${brand.name}: Hi ${b.sender.name}, your order is booked.\nTracking: ${b.awb}\n${b.fromCity} → ${b.toCity} · ${b.pieces} parcel(s) · ₹${b.price}\nReceiver: ${b.receiver.name} (+91 ${b.receiver.phone})` },
    { to: b.receiver.phone, role: "receiver", text: `${brand.name}: Hi ${b.receiver.name}, ${b.sender.name} (+91 ${b.sender.phone}) is sending you a parcel from ${b.fromCity}.\nTracking: ${b.awb}` },
  ];
  const out: Record<string, "sent" | "off" | "failed"> = {};
  for (const m of msgs) {
    let status: "sent" | "off" | "failed" = "off"; let err: string | null = null;
    try { status = (await sendWhatsapp({ to: m.to, message: m.text, linkUrl: link })) ? "sent" : "off"; } catch (e) { status = "failed"; err = (e as Error).message.slice(0, 300); }
    out[m.role] = status;
    await supabaseAdmin.from("notifications").insert({ user_id: m.role === "sender" ? b.userId : null, channel: "whatsapp", kind: "booking", recipient: m.to, subject: `Booking ${b.awb}`, body: `${m.text}\n${link}`, status: status === "sent" ? "sent" : status === "off" ? "skipped" : "failed", error: err, sent_at: status === "sent" ? new Date().toISOString() : null, meta: { shipment_id: b.id, role: m.role } });
  }
  return out;
}
