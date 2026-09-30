'use client';

import type { BaremeConfortItem } from '@/lib/types';
import { calculSurfaceConfort } from '@/lib/confort';

interface ConfortCalculatorProps {
  bareme: BaremeConfortItem[];
  equipements: Record<string, number>;
  onChange: (surfaceConfort: number, equipements: Record<string, number>) => void;
}

export function ConfortCalculator({ bareme, equipements, onChange }: ConfortCalculatorProps) {
  function handleQuantityChange(label: string, quantity: number) {
    const nextEquipements = { ...equipements, [label]: quantity };
    onChange(calculSurfaceConfort(nextEquipements, bareme), nextEquipements);
  }

  return (
    <fieldset className="space-y-1.5 border-l-2 border-line pl-3 sm:space-y-2 sm:pl-4">
      <legend className="text-xs text-ink-soft sm:text-sm">Équipements (surface confort)</legend>
      {bareme.map((item) => (
        <div key={item.label} className="flex items-center gap-2 sm:gap-3">
          <label htmlFor={`confort-${item.label}`} className="w-36 text-xs text-ink sm:w-48 sm:text-sm">
            {item.label}
          </label>
          <input
            id={`confort-${item.label}`}
            aria-label={item.label}
            type="number"
            min={0}
            value={equipements[item.label] ?? 0}
            onChange={(e) => handleQuantityChange(item.label, Number(e.target.value) || 0)}
            className="w-14 border-0 border-b border-line bg-transparent py-1 text-right font-mono tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-0 sm:w-16"
          />
          <span className="font-mono text-[10px] text-ink-soft sm:text-xs">+{item.m2Bonus} m² / unité</span>
        </div>
      ))}
    </fieldset>
  );
}
