'use client';

import type { BaremeConfortItem } from '@/lib/types';

interface BaremeConfortTableProps {
  rows: BaremeConfortItem[];
  onChange: (rows: BaremeConfortItem[]) => void;
}

export function BaremeConfortTable({ rows, onChange }: BaremeConfortTableProps) {
  function updateRow(index: number, patch: Partial<BaremeConfortItem>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, { label: '', m2Bonus: 0 }]);
  }

  return (
    <div className="p-8">
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
          {rows.map((row, index) => (
            <tr key={index} className="border-b">
              <td className="p-2">
                <input
                  value={row.label}
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <input
                  type="number"
                  value={row.m2Bonus}
                  onChange={(e) => updateRow(index, { m2Bonus: Number(e.target.value) || 0 })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <button onClick={() => removeRow(index)} className="text-red-600">
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="mt-4 rounded bg-slate-900 px-4 py-2 text-white">
        Ajouter une ligne
      </button>
    </div>
  );
}
