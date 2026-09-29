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
    <form onSubmit={handleSubmit} className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Barème confort</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Équipement</th>
            <th className="p-2">m² bonus</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {local.map((row, index) => (
            <tr key={index} className="border-b">
              <td className="p-2">
                <input
                  aria-label={`Équipement ligne ${index + 1}`}
                  value={row.label}
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <input
                  aria-label={`m² bonus ligne ${index + 1}`}
                  type="number"
                  value={row.m2Bonus}
                  onChange={(e) => updateRow(index, { m2Bonus: Number(e.target.value) || 0 })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <button type="button" onClick={() => removeRow(index)} className="text-red-600">
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={addRow} className="rounded border px-4 py-2">
          Ajouter une ligne
        </button>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Enregistrer
        </button>
      </div>
    </form>
  );
}
