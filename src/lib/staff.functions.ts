import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireUser } from './auth-guard';

export const staffAssignmentSchema = z.object({
  user: z.string().uuid(),
  role: z.enum(['point','network','state_manager','state_director','area_manager']),
  enabled: z.boolean(), state: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(), pin: z.string().regex(/^\d{6}$/).optional(),
});
export const manageStaff = createServerFn({method:'POST'}).middleware([requireUser])
  .inputValidator((input: z.input<typeof staffAssignmentSchema>)=>staffAssignmentSchema.parse(input))
  .handler(async({data,context})=>{
    const r=await context.supabase.rpc('manage_staff_assignment',{
      _user:data.user,_role:data.role,_enabled:data.enabled,
      ...(data.state?{_state:data.state}:{}),
      ...(data.area?{_area:data.area}:{}),
      ...(data.pin?{_pin:data.pin}:{}),
    });
    if(r.error) throw new Error(r.error.message);
    return {ok:true};
  });
export const staffAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be 10 digits').optional().or(z.literal('')),
  role: z.enum(['customer','admin','point','network','state_manager','state_director','area_manager']),
  state: z.string().trim().max(80).optional().or(z.literal('')),
  area: z.string().trim().max(80).optional(),
  pin: z.string().regex(/^\d{6}$/).optional().or(z.literal('')),
});

/** Admin: create a ready-to-use staff login (no email/phone verification) and assign its role + territory. */
export const createStaffAccount = createServerFn({method:'POST'}).middleware([requireUser])
  .inputValidator((input: z.input<typeof staffAccountSchema>)=>staffAccountSchema.parse(input))
  .handler(async({data,context})=>{
    const { data: isAdmin } = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
    if(!isAdmin) throw new Error('Admin access required');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.full_name, ...(data.phone ? { phone: data.phone } : {}) },
    });
    if(created.error || !created.data.user) throw new Error(created.error?.message.includes('already') ? 'An account with this email already exists — assign the role from the list below instead.' : created.error?.message ?? 'Could not create the account');
    const id = created.data.user.id;
    await supabaseAdmin.from('profiles').upsert({ id, full_name: data.full_name, contact_email: data.email, ...(data.phone ? { phone: data.phone, phone_verified: true } : {}), onboarded_at: new Date().toISOString() } as never);
    if (data.role === 'customer') return { ok: true, userId: id };
    if (data.role === 'admin') {
      const ins = await supabaseAdmin.from('user_roles').insert({ user_id: id, role: 'admin' } as never);
      if (ins.error) { await supabaseAdmin.auth.admin.deleteUser(id); throw new Error(ins.error.message); }
      return { ok: true, userId: id };
    }
    if (!data.state) { await supabaseAdmin.auth.admin.deleteUser(id); throw new Error('State is required for staff positions'); }
    const r = await context.supabase.rpc('manage_staff_assignment',{ _user:id,_role:data.role,_enabled:true,_state:data.state, ...(data.area?{_area:data.area}:{}), ...(data.pin?{_pin:data.pin}:{}) });
    if(r.error){ await supabaseAdmin.auth.admin.deleteUser(id); throw new Error(r.error.message); }
    return { ok: true, userId: id };
  });

/** Staff: email the sender/receiver that a parcel's status changed (uses the "Parcel status update" template). */
export const notifyStatusEmail = createServerFn({method:'POST'}).middleware([requireUser])
  .inputValidator((input:{ids?:string[];tracking?:string})=>z.object({ ids: z.array(z.string().uuid()).max(200).optional(), tracking: z.string().trim().max(40).optional() }).parse(input))
  .handler(async({data,context})=>{
    const { data: staff } = await context.supabase.rpc('is_staff',{_u:context.userId});
    if(!staff) throw new Error('Staff access required');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    let q = supabaseAdmin.from('shipments').select('tracking_number,status,user_id,sender_name,sender_email,receiver_name,receiver_email');
    if(data.ids?.length) q = q.in('id', data.ids); else if(data.tracking) q = q.ilike('tracking_number', data.tracking); else return { sent: 0 };
    const { data: rows } = await q.limit(200);
    const { sendTemplate } = await import('./email.functions');
    const origin = new URL(process.env['PUBLIC_BASE_URL'] ?? 'https://getxpress.in').origin;
    let sent = 0;
    for (const s of rows ?? []) {
      const status = String(s.status).replace(/_/g,' ');
      for (const [name, email] of [[s.sender_name, s.sender_email],[s.receiver_name, s.receiver_email]] as const) {
        if(!email) continue;
        const r = await sendTemplate('shipment_update', email, { name, tracking: s.tracking_number, status, link: `${origin}/track?id=${s.tracking_number}` });
        if(r.sent) sent++;
      }
      if (s.status === 'delivered' && s.user_id) await firstDeliveryReward(supabaseAdmin, s.user_id, origin).catch((e) => console.error('reward', e));
    }
    return { sent };
  });

/** Server-only: once per customer, after their first delivered parcel, create a private 10% code and email it. */
async function firstDeliveryReward(admin: any, userId: string, origin: string) {
  const { count } = await admin.from('shipments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'delivered');
  if ((count ?? 0) !== 1) return;
  const { data: done } = await admin.from('first_order_rewards').select('user_id').eq('user_id', userId).maybeSingle();
  if (done) return;
  const { data: prof } = await admin.from('profiles').select('full_name,contact_email').eq('id', userId).maybeSingle();
  const code = 'GXW' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const { data: c, error } = await admin.from('coupons').insert({ code, discount_type: 'percent', discount_value: 10, max_uses: 1, per_user_limit: 1, show_on_site: false, is_private_reward: true, active: true, description: 'First delivery reward', expires_at: new Date(Date.now() + 60 * 864e5).toISOString() }).select('id').single();
  if (error) throw error;
  const ins = await admin.from('first_order_rewards').insert({ user_id: userId, coupon_id: c.id });
  if (ins.error) { await admin.from('coupons').delete().eq('id', c.id); return; }
  if (prof?.contact_email) {
    const { sendSmtp } = await import('./email.functions');
    await sendSmtp(prof.contact_email, 'Thank you! Here is 10% off your next parcel', `Hi ${prof.full_name ?? 'there'},\n\nYour first GetXpress parcel was delivered. As a thank you, use code ${code} for 10% off your next booking (valid 60 days, one use).`, { templateKey: 'first_delivery_reward', cta: { label: 'Book next parcel', href: `${origin}/ship` } });
  }
}

/** Admin/manager: allocate every PIN of a city/district area to one staff member in a single action. */
export const assignAreaPins = createServerFn({method:'POST'}).middleware([requireUser])
  .inputValidator((i:{user:string;role:string;state:string;area:string})=>z.object({ user: z.string().uuid(), role: z.enum(['point','network','state_manager','state_director','area_manager']), state: z.string().trim().min(2).max(80), area: z.string().trim().min(2).max(80) }).parse(i))
  .handler(async({data,context})=>{
    const { data: staff } = await context.supabase.rpc('is_staff',{_u:context.userId});
    if(!staff) throw new Error('Staff access required');
    const term = `%${data.area.replace(/[%_]/g,'')}%`;
    const { data: pins, error } = await context.supabase.from('pincodes').select('pincode').eq('state', data.state).or(`city.ilike.${term},area.ilike.${term}`).limit(400);
    if(error) throw new Error(error.message);
    let added = 0; const failed: string[] = [];
    for (const p of pins ?? []) {
      const r = await context.supabase.rpc('allocate_pincode',{ _pincode: p.pincode, _holder: data.user, _holder_role: data.role, _note: `Area: ${data.area}` });
      if (r.error) failed.push(p.pincode); else added++;
    }
    return { found: pins?.length ?? 0, added, failed: failed.slice(0, 20) };
  });
