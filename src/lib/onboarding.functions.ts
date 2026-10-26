import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireUser } from './auth-guard';
import { contactSchema } from './contact-schema';
export const saveContactDetails = createServerFn({method:'POST'}).middleware([requireUser])
 .inputValidator((input: z.input<typeof contactSchema>) => contactSchema.parse(input))
 .handler(async ({data,context}) => {
  const {phone,whatsapp,...details}=data;
  const {data:current,error:readError}=await context.supabase.from('profiles').select('phone,phone_verified').eq('id',context.userId).maybeSingle();
  if(readError) throw new Error('Could not load your profile. Please retry.');
  const number=`+91${phone || whatsapp}`;
  const unchanged=current?.phone === number;
  const {error}=await context.supabase.from('profiles').upsert({id:context.userId,...details, full_name:`${data.first_name} ${data.last_name}`,phone:number,whatsapp:whatsapp ? `+91${whatsapp}` : null,phone_verified:unchanged && Boolean(current?.phone_verified),updated_at:new Date().toISOString()});
  if(error) throw new Error(error.message);
  return {number,verified:unchanged && Boolean(current?.phone_verified)};
 });
export const finishOnboarding = createServerFn({method:'POST'}).middleware([requireUser])
 .inputValidator((input:{state:string;district:string;city?:string;pincode?:string}) => z.object({state:z.string().trim().min(2,'Select your state').max(60),district:z.string().trim().min(2,'Enter your district').max(80),city:z.string().trim().max(80).optional(),pincode:z.string().regex(/^(\d{6})?$/,'Pincode must be 6 digits').optional()}).parse(input))
 .handler(async ({data,context}) => {
  const {data:p,error:readError}=await context.supabase.from('profiles').select('phone_verified,first_name,last_name,contact_email').eq('id',context.userId).maybeSingle();
  if(readError || !p?.phone_verified || !p.first_name || !p.last_name || !p.contact_email) throw new Error('Complete your details and verify your contact first.');
  const {error}=await context.supabase.from('profiles').update({state:data.state,district:data.district,city:data.city||data.district,...(data.pincode?{pincode:data.pincode}:{}),onboarded_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',context.userId);
  if(error) throw new Error(error.message); return {ok:true};
 });
