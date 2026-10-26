import {describe,it,expect} from 'vitest';
import {directorySearch} from './india-directory';
import {postalLookup} from './postal';
describe('open India PIN lookup',()=>{
 it('resolves town PIN 335707 without network',async()=>{const r=await postalLookup('335707');expect(r?.pincode).toBe('335707');expect(r?.state).toBe('Rajasthan');expect(r?.areas.length).toBeGreaterThan(1);});
 it('finds Raisinghnagar by locality name',async()=>expect((await directorySearch('raisinghnagar')).some(r=>r.pincode==='335051')).toBe(true));
 it('preserves Mumbai postal areas instead of requiring district headquarters',async()=>{const r=await postalLookup('400001');expect(r?.city).toBe('Mumbai');expect(r?.areas.length).toBeGreaterThan(1);});
 it('matches six-digit PIN exactly from prefix buckets',async()=>{const r=await directorySearch('302017');expect(r.length).toBe(1);expect(r[0]?.pincode).toBe('302017');});
 it('returns no false PIN matches',async()=>expect(await directorySearch('000000')).toEqual([]));
 it('resolves Rajasthan state for town PIN',async()=>expect((await directorySearch('335707'))[0]?.state).toBe('Rajasthan'));
});