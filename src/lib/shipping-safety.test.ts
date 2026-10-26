import { describe,it,expect } from 'vitest';
import { shippingDeclaration } from './shipping-safety';
describe('shipping safety',()=>{
 it('requires policy acceptance',()=>expect(shippingDeclaration.safeParse({contents:'Books',policy_accepted:false}).success).toBe(false));
 for(const contents of ['Arms','Explosives','Illegal drugs']) it(`rejects ${contents}`,()=>expect(shippingDeclaration.safeParse({contents,policy_accepted:true}).success).toBe(false));
 it('accepts a declared legal parcel',()=>expect(shippingDeclaration.safeParse({contents:'Clothes and books',policy_accepted:true}).success).toBe(true));
});