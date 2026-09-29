import { describe, expect, it } from 'vitest';
import { createDefaultDataStore, createEmptyBien } from './defaultData';

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

describe('createEmptyBien', () => {
  it('seeds the credit terms from the settings instead of hardcoded values', () => {
    const bien = createEmptyBien('b1', {
      objectifRentabilitePourcent: 6,
      tauxCreditParDefaut: 4.2,
      dureeCreditParDefautAnnees: 20,
    });

    expect(bien.tauxCredit).toBe(4.2);
    expect(bien.dureeCreditAnnees).toBe(20);
    expect(bien.id).toBe('b1');
  });
});
