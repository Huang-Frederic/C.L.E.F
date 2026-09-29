import { describe, expect, it } from 'vitest';
import { calculSurfaceConfort } from './confort';
import type { BaremeConfortItem } from './types';

const bareme: BaremeConfortItem[] = [
  { label: 'Eau courante', m2Bonus: 4 },
  { label: 'Gaz', m2Bonus: 2 },
  { label: 'Électricité', m2Bonus: 2 },
  { label: 'Lavabo', m2Bonus: 3 },
  { label: 'WC', m2Bonus: 3 },
  { label: 'Baignoire', m2Bonus: 5 },
  { label: 'Douche', m2Bonus: 4 },
  { label: 'Chauffage par pièce', m2Bonus: 2 },
];

describe('calculSurfaceConfort', () => {
  it('matches the original spreadsheet total', () => {
    const equipements = {
      'Eau courante': 1,
      Gaz: 1,
      Électricité: 1,
      Lavabo: 2,
      WC: 1,
      Baignoire: 1,
      Douche: 0,
      'Chauffage par pièce': 4,
    };
    expect(calculSurfaceConfort(equipements, bareme)).toBe(30);
  });

  it('treats a missing equipment quantity as 0', () => {
    expect(calculSurfaceConfort({}, bareme)).toBe(0);
  });
});
