import {describe,it,expect,vi} from 'vitest';
import {createSearchCache,boundedSearch} from './search-cache';
describe('location request cache',()=>{
 it('coalesces simultaneous requests and reuses cached results',async()=>{const c=createSearchCache<string[]>();const load=vi.fn(async()=>['Jaipur']);const [a,b]=await Promise.all([c.get('jaipur',load),c.get('jaipur',load)]);expect(a).toEqual(b);await c.get('jaipur',load);expect(load).toHaveBeenCalledTimes(1)});
 it('evicts old queries when capacity is reached',async()=>{const c=createSearchCache<number>(10000,1);await c.get('a',async()=>1);await c.get('b',async()=>2);expect(await c.get('a',async()=>3)).toBe(3)});
 it('preserves fallback when another provider fails',async()=>{const r=await Promise.all([boundedSearch(async()=>{throw Error('offline')}),boundedSearch(async()=>['302001'])]);expect(r).toEqual([[],['302001']])});
});
