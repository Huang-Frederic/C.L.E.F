'use client';

import type { ReferentielLoyer } from '@/lib/types';

interface ReferentielTableProps {
  rows: ReferentielLoyer[];
  onChange: (rows: ReferentielLoyer[]) => void;
}

export function ReferentielTable({ rows, onChange }: ReferentielTableProps) {
  function updateRow(index: number, patch: Partial<ReferentielLoyer>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, { ville: '', typePiece: '', loyerM2: 0 }]);
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Référentiel loyers</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Ville</th>
            <th className="p-2">Type</th>
            <th className="p-2">Loyer m2</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b">
              <td className="p-2">
                <input
                  value={row.ville}
                  onChange={(e) => updateRow(index, { ville: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <input
                  value={row.typePiece}
                  onChange={(e) => updateRow(index, { typePiece: e.target.value })}
                  className="w-full rounded border px-2 py-1"
                />
              </td>
              <td className="p-2">
                <input
                  type="number"
                  value={row.loyerM2}
                  onChange={(e) => updateRow(index, { loyerM2: Number(e.target.value) || 0 })}
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
