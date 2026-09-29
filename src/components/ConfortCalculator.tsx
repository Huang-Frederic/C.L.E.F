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
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Équipements (surface confort)</legend>
      {bareme.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <label htmlFor={`confort-${item.label}`} className="w-48">
            {item.label}
          </label>
          <input
            id={`confort-${item.label}`}
            aria-label={item.label}
            type="number"
            min={0}
            value={equipements[item.label] ?? 0}
            onChange={(e) => handleQuantityChange(item.label, Number(e.target.value) || 0)}
            className="w-20 rounded border px-2 py-1"
          />
          <span className="text-sm text-slate-500">+{item.m2Bonus} m² / unité</span>
        </div>
      ))}
    </fieldset>
  );
}
