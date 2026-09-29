import { describe, expect, it } from 'vitest';
import { createDefaultDataStore } from './defaultData';

describe('createDefaultDataStore', () => {
  it('returns an empty biens list and a pre-filled bareme confort', () => {
    const data = createDefaultDataStore();
    expect(data.biens).toEqual([]);
    expect(data.referentielLoyers).toEqual([]);
    expect(data.baremeConfort).toHaveLength(8);
    expect(data.baremeConfort[0]).toEqual({ label: 'Eau courante', m2Bonus: 4 });
  });

  it('defaults settings to a 6% target yield', () => {
    const data = createDefaultDataStore();
    expect(data.settings.objectifRentabilitePourcent).toBe(6);
  });
});
