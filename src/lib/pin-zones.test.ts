import { describe, it, expect } from 'vitest';
import { zoneFor, tierFor, displayZone } from './pin-zones';
describe('pin zones', () => {
  it('Rajasthan is North', () => expect(zoneFor('Rajasthan')).toBe('North'));
  it('Mumbai is Tier 1', () => expect(tierFor('Mumbai')).toBe('Tier 1'));
  it('Jaipur is Tier 2', () => expect(tierFor('Jaipur')).toBe('Tier 2'));
  it('Gharsana is Tier 3', () => expect(tierFor('Gharsana')).toBe('Tier 3'));
  it('district stored as zone becomes state zone', () => expect(displayZone({ zone: 'Ganganagar', state: 'Rajasthan', city: 'Gharsana' })).toBe('North'));
});
