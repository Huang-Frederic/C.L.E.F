'use client';

import Link from 'next/link';
import type { Bien, ReferentielLoyer, Settings } from '@/lib/types';
import {
  calculMensualiteCredit,
  calculMensualiteBreakeven,
  calculRentabiliteNettePourcent,
  calculMaxEncheres,
  trouverLoyerM2,
} from '@/lib/calculations';

interface BienTableProps {
  biens: Bien[];
  referentielLoyers: ReferentielLoyer[];
  settings: Settings;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function BienTable({ biens, referentielLoyers, settings, onDelete, onAdd }: BienTableProps) {
  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Biens</h1>
        <button onClick={onAdd} className="rounded bg-slate-900 px-4 py-2 text-white">
          Ajouter un bien
        </button>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Lieu</th>
            <th className="p-2">Type</th>
            <th className="p-2">Mensualité crédit</th>
            <th className="p-2">Breakeven</th>
            <th className="p-2">Rentabilité nette</th>
            <th className="p-2">Max enchères</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {biens.map((bien) => {
            const loyerM2 = trouverLoyerM2(bien, referentielLoyers);
            return (
              <tr key={bien.id} className="border-b">
                <td className="p-2">
                  <Link href={`/biens/${bien.id}`}>{bien.lieu}</Link>
                </td>
                <td className="p-2">{bien.typePiece}</td>
                <td className="p-2">{calculMensualiteCredit(bien).toFixed(2)} €</td>
                <td className="p-2">
                  {loyerM2 === null ? 'loyer inconnu' : `${calculMensualiteBreakeven(bien, referentielLoyers).toFixed(2)} €`}
                </td>
                <td className="p-2">
                  {loyerM2 === null
                    ? 'loyer inconnu'
                    : `${calculRentabiliteNettePourcent(bien, referentielLoyers).toFixed(2)}%`}
                </td>
                <td className="p-2">
                  {loyerM2 === null
                    ? 'loyer inconnu'
                    : `${calculMaxEncheres(bien, referentielLoyers, settings.objectifRentabilitePourcent).toFixed(0)} €`}
                </td>
                <td className="p-2">
                  <button onClick={() => onDelete(bien.id)} className="text-red-600">
                    Supprimer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
