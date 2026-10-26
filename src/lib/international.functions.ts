import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireUser } from './auth-guard';
import { shippingDeclaration } from './shipping-safety';
const party=z.object({name:z.string().trim().min(2,'Enter the full name').max(100),phone:z.string().regex(/^\+?[1-9]\d{7,14}$/,'Enter mobile with country code, e.g. +14155550123'),email:z.string().email('Enter a valid email, e.g. name@gmail.com').max(255),country:z.string().trim().min(2,'Select a country').max(80),address:z.string().trim().min(8,'Address is too short — add house number, street and area').max(400),city:z.string().trim().min(2,'Enter the city / town').max(80),postal_code:z.string().trim().min(2,'Enter the postal / ZIP code').max(20)});
export const internationalSchema=shippingDeclaration.extend({sender:party,receiver:party,weight_kg:z.number().min(0.05).max(100),declared_value:z.number().min(0).max(1000000)});
export const requestInternationalQuote=createServerFn({method:'POST'}).middleware([requireUser]).inputValidator((d:z.input<typeof internationalSchema>)=>internationalSchema.parse(d)).handler(async({data,context})=>{
 const {policy_accepted,...payload}=data;
 const r=await context.supabase.from('international_quote_requests').insert({...payload,user_id:context.userId}).select('id,reference,status').single();
 if(r.error) throw new Error('Your quote request could not be saved. Please retry.');
 return r.data;
});
export const intlBookingSchema = z.object({
  reference: z.string().trim().toUpperCase().regex(/^GX[A-Z0-9-]{4,20}$/, 'Enter your GXI quote reference'),
  service: z.enum(['cheapest', 'fastest', 'as_quoted']),
  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a pickup date'),
  pickup_slot: z.enum(['morning', 'afternoon', 'evening']),
  pickup_address: z.string().trim().min(8, 'Add the full pickup address').max(400),
  pickup_contact: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Enter pickup mobile with country code, e.g. +919876543210'),
  payment: z.enum(['pay_at_pickup', 'upi_after_price', 'wallet']),
  kyc_document: z.enum(['aadhaar', 'pan', 'passport']),
  packaging_help: z.boolean().default(false),
  notes: z.string().trim().max(500).default(''),
  agree: z.literal(true, { errorMap: () => ({ message: 'Accept the final price and customs check' }) }),
}).superRefine((v, ctx) => {
  const d = new Date(`${v.pickup_date}T00:00:00+05:30`).getTime(), today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00+05:30').getTime();
  if (!(d >= today && d <= today + 30 * 864e5)) ctx.addIssue({ code: 'custom', path: ['pickup_date'], message: 'Pickup date must be within the next 30 days' });
});

const SERVICE_NAME = { cheapest: 'Lowest price', fastest: 'Fastest delivery', as_quoted: 'As quoted by GetXpress' } as const;

/** Customer turns a saved quote reference into a booking request; staff confirm the final price and dispatch. */
export const bookInternationalQuote = createServerFn({ method: 'POST' }).middleware([requireUser])
  .inputValidator((d: z.input<typeof intlBookingSchema>) => intlBookingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { reference, service, agree: _agree, ...booking } = data;
    const r = await context.supabase.rpc('book_international_quote', { _ref: reference, _booking: { ...booking, service }, _service: SERVICE_NAME[service] });
    if (r.error) throw new Error(r.error.message.replace(/^.*?: /, ''));
    return r.data as { reference: string; status: string };
  });

export const quoteStatusSchema = z.object({ id: z.string().uuid(), status: z.enum(['pending', 'reviewing', 'quoted', 'booking_requested', 'booked', 'picked_up', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'cancelled']), note: z.string().trim().max(300).default(''), price: z.number().min(0).max(10_000_000).nullable().default(null), awb: z.string().trim().max(40).default('') });
/** Staff move an international shipment along; each change is added to the public tracking timeline. */
export const updateQuoteStatus = createServerFn({ method: 'POST' }).middleware([requireUser])
  .inputValidator((d: z.input<typeof quoteStatusSchema>) => quoteStatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    const r = await context.supabase.rpc('update_quote_status', { _id: data.id, _status: data.status, _note: data.note, ...(data.price != null ? { _price: data.price } : {}), _awb: data.awb });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });
