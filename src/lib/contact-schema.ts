import { z } from 'zod';
const phone = z.string().trim().refine(v => v === '' || /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian number');
export const contactSchema = z.object({
 first_name: z.string().trim().min(2, 'Enter your first name').max(60),
 last_name: z.string().trim().min(1, 'Enter your last name').max(60),
 age: z.coerce.number().int().min(13).max(100), gender: z.enum(['female','male','other']),
 contact_email: z.string().trim().email('Enter a valid email').max(255), phone, whatsapp: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter your WhatsApp number'),
}).refine(v => Boolean(v.phone || v.whatsapp), { message: 'Enter either a phone or WhatsApp number', path: ['phone'] });
