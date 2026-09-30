'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { ReferentielLoyer } from '@/lib/types';

interface ReferentielTableProps {
  rows: ReferentielLoyer[];
  onSave: (rows: ReferentielLoyer[]) => void;
}

interface VilleGroup {
  ville: string;
  entries: Array<{ row: ReferentielLoyer; index: number }>;
}

/** Groups the flat rows by `ville`, preserving first-seen order of both cities and rows. */
function groupByVille(rows: ReferentielLoyer[]): VilleGroup[] {
  const groups: VilleGroup[] = [];
  const byVille = new Map<string, VilleGroup>();
  rows.forEach((row, index) => {
    let group = byVille.get(row.ville);
    if (!group) {
      group = { ville: row.ville, entries: [] };
      byVille.set(row.ville, group);
      groups.push(group);
    }
    group.entries.push({ row, index });
  });
  return groups;
}

// Color-codes the "Type" tag so the same type reads consistently across every
// city — a fallback tone covers any type outside the four usual ones.
const TYPE_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  '1P': { bg: '#F7D9E3', text: '#8F3752' },
  '2P': { bg: '#F7E3D9', text: '#8F5637' },
  '3P': { bg: '#EAD9F7', text: '#6B3D8F' },
  '4P+': { bg: '#F7D9D9', text: '#8F3737' },
};
const FALLBACK_TAG_COLOR = { bg: '#F0E6E9', text: '#7A6169' };

function tagColorFor(typePiece: string) {
  return TYPE_TAG_COLORS[typePiece] ?? FALLBACK_TAG_COLOR;
}

export function ReferentielTable({ rows, onSave }: ReferentielTableProps) {
  // Local state so typing is instant: the parent only sees the rows when the
  // user explicitly submits (spec: "sauvegarde explicite […] pas à chaque frappe").
  const [local, setLocal] = useState<ReferentielLoyer[]>(rows);

  // Resync when the parent hands down a new array from an external source
  // (e.g. a post-conflict reload) so we don't keep echoing stale rows.
  useEffect(() => {
    setLocal(rows);
  }, [rows]);

  function updateRow(index: number, patch: Partial<ReferentielLoyer>) {
    setLocal((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  // Renaming a city's group header must move every type that shares it, not
  // just the row that happens to hold the input.
  function renameVille(oldVille: string, newVille: string) {
    setLocal((current) => current.map((row) => (row.ville === oldVille ? { ...row, ville: newVille } : row)));
  }

  function removeRow(index: number) {
    setLocal((current) => current.filter((_, i) => i !== index));
  }

  function addType(ville: string) {
    setLocal((current) => [...current, { ville, typePiece: '', loyerM2: 0 }]);
  }

  function addVille() {
    setLocal((current) => [...current, { ville: '', typePiece: '', loyerM2: 0 }]);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(local);
  }

  const groups = groupByVille(local);

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-8">
      <div className="mb-3 border-b border-line pb-2 sm:mb-6 sm:pb-4">
        <h1 className="font-serif text-lg text-ink sm:text-2xl">Référentiel loyers</h1>
        <div className="mt-2 flex gap-2 sm:mt-3 sm:gap-3">
          <button
            type="button"
            onClick={addVille}
            className="border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-ink-soft hover:text-ink sm:px-4 sm:py-2 sm:text-sm"
          >
            Ajouter une ville
          </button>
          <button
            type="submit"
            className="bg-accent px-3 py-1.5 text-xs font-medium text-paper hover:bg-accent-dark sm:px-4 sm:py-2 sm:text-sm"
          >
            Enregistrer
          </button>
        </div>
      </div>
      {/* With 20+ cities, per-card chrome (padding/margins) dominates total
          height far more than the data itself — kept deliberately tight. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="border border-line bg-paper-raised p-2 sm:p-3">
            <input
              aria-label={`Ville groupe ${groupIndex + 1}`}
              value={group.ville}
              onChange={(e) => renameVille(group.ville, e.target.value)}
              placeholder="Ville"
              className="mb-1.5 w-full border-0 border-b-2 border-ink/20 bg-transparent pb-0.5 font-serif text-sm text-ink focus:border-accent focus:outline-none focus:ring-0 sm:text-base"
            />
            <div className="space-y-1">
              {group.entries.map(({ row, index }) => {
                const tag = tagColorFor(row.typePiece);
                return (
                  <div key={index} className="flex items-center gap-1.5">
                    <input
                      aria-label={`Type ligne ${index + 1}`}
                      value={row.typePiece}
                      onChange={(e) => updateRow(index, { typePiece: e.target.value })}
                      style={{ backgroundColor: tag.bg, color: tag.text }}
                      className="w-14 shrink-0 px-1.5 py-0.5 text-center text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      aria-label={`Loyer m2 ligne ${index + 1}`}
                      type="number"
                      value={row.loyerM2}
                      onChange={(e) => updateRow(index, { loyerM2: Number(e.target.value) || 0 })}
                      className="flex-1 border-0 border-b border-line bg-transparent py-0.5 text-right font-mono tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-0"
                    />
                    <span className="shrink-0 font-mono text-[10px] text-ink-soft">€/m²</span>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      aria-label={`Supprimer ligne ${index + 1}`}
                      className="shrink-0 text-sm text-warn hover:text-warn/70"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => addType(group.ville)}
              className="mt-1.5 text-xs text-ink-soft hover:text-accent"
            >
              Ajouter un type
            </button>
          </div>
        ))}
      </div>
    </form>
  );
}
