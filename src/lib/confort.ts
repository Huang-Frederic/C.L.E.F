import type { BaremeConfortItem } from './types';

export function calculSurfaceConfort(
  equipements: Record<string, number>,
  bareme: BaremeConfortItem[]
): number {
  return bareme.reduce((total, item) => total + (equipements[item.label] ?? 0) * item.m2Bonus, 0);
}
