import {describe,it,expect} from 'vitest';
import {contactSchema} from './contact-schema';
const valid={first_name:'Priya',last_name:'Sharma',age:24,gender:'female',contact_email:'priya@example.com',phone:'9876543210',whatsapp:'9876543210'};
describe('onboarding contact rule',()=>{
 it('requires WhatsApp even with a phone',()=>expect(contactSchema.safeParse({...valid,whatsapp:''}).success).toBe(false));
 it('accepts WhatsApp without phone',()=>expect(contactSchema.safeParse({...valid,phone:'',whatsapp:'9876543210'}).success).toBe(true));
 it('rejects both numbers missing',()=>expect(contactSchema.safeParse({...valid,phone:'',whatsapp:''}).success).toBe(false));
 it('rejects invalid supplied WhatsApp even with valid phone',()=>expect(contactSchema.safeParse({...valid,whatsapp:'123'}).success).toBe(false));
});
