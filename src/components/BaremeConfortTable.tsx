'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { BaremeConfortItem } from '@/lib/types';

interface BaremeConfortTableProps {
  rows: BaremeConfortItem[];
  onSave: (rows: BaremeConfortItem[]) => void;
}

export function BaremeConfortTable({ rows, onSave }: BaremeConfortTableProps) {
  // Local state so typing is instant: the parent only sees the rows when the
  // user explicitly submits (spec: "sauvegarde explicite […] pas à chaque frappe").
  const [local, setLocal] = useState<BaremeConfortItem[]>(rows);

  // Resync when the parent hands down a new array from an external source
  // (e.g. a post-conflict reload) so we don't keep echoing stale rows.
  useEffect(() => {
    setLocal(rows);
  }, [rows]);

  function updateRow(index: number, patch: Partial<BaremeConfortItem>) {
    setLocal((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setLocal((current) => current.filter((_, i) => i !== index));
  }

  function addRow() {
    setLocal((current) => [...current, { label: '', m2Bonus: 0 }]);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(local);
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-8">
      <div className="mb-3 border-b border-line pb-2 sm:mb-6 sm:pb-4">
        <h1 className="font-serif text-lg text-ink sm:text-2xl">Barème confort</h1>
        <div className="mt-2 flex gap-2 sm:mt-3 sm:gap-3">
          <button
            type="button"
            onClick={addRow}
            className="border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-ink-soft hover:text-ink sm:px-4 sm:py-2 sm:text-sm"
          >
            Ajouter une ligne
          </button>
          <button
            type="submit"
            className="bg-accent px-3 py-1.5 text-xs font-medium text-paper hover:bg-accent-dark sm:px-4 sm:py-2 sm:text-sm"
          >
            Enregistrer
          </button>
        </div>
      </div>
      {/* A tall stacked tile (badge / label / delete, each on its own line) cost
          ~130px per item; flattened into one row it's ~40px, so the same 8
          equipements fit in roughly a third of the vertical space. */}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
        {local.map((row, index) => (
          <div key={index} className="flex items-center gap-2 border border-line bg-paper-raised p-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <input
                aria-label={`m² bonus ligne ${index + 1}`}
                type="number"
                value={row.m2Bonus}
                onChange={(e) => updateRow(index, { m2Bonus: Number(e.target.value) || 0 })}
                className="w-6 border-0 bg-transparent text-center font-mono text-xs font-medium text-accent-dark focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <input
              aria-label={`Équipement ligne ${index + 1}`}
              value={row.label}
              onChange={(e) => updateRow(index, { label: e.target.value })}
              className="min-w-0 flex-1 border-0 border-b border-line bg-transparent py-0.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-0 sm:text-sm"
            />
            <span className="shrink-0 font-mono text-[10px] text-ink-soft">m²</span>
            <button
              type="button"
              onClick={() => removeRow(index)}
              aria-label={`Supprimer ligne ${index + 1}`}
              className="shrink-0 text-sm text-warn hover:text-warn/70"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </form>
  );
}
