import { z } from 'zod';
export const PROHIBITED = /\b(arms|weapons?|firearms?|ammunition|explosives?|narcotics|cocaine|heroin|methamphetamine|illegal drugs)\b/i;
export const shippingDeclaration = z.object({
  contents: z.string().trim().min(2, 'Describe the items inside').max(200).refine(v => !PROHIBITED.test(v), 'Prohibited items cannot be shipped'),
  policy_accepted: z.literal(true, { errorMap: () => ({ message: 'Accept the shipping policies before booking' }) }),
});