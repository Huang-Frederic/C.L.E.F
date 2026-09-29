'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { MontageFinancier } from '@/lib/types';
import { calculMontageFinancier } from '@/lib/calculations';

interface MontageFinancierFormProps {
  montage: MontageFinancier;
  onSave: (montage: MontageFinancier) => void;
}

const FIELDS: Array<{ key: keyof MontageFinancier; label: string }> = [
  { key: 'prixAchat', label: 'Prix achat' },
  { key: 'prixTravaux', label: 'Prix travaux' },
  { key: 'tauxCredit', label: 'Taux crédit (%)' },
  { key: 'dureeCreditAnnees', label: 'Durée crédit (années)' },
  { key: 'loyerHypothese', label: 'Loyer hypothèse' },
  { key: 'pno', label: 'PNO' },
  { key: 'assuranceEmprunteurMensuel', label: 'Assurance emprunteur / mois' },
  { key: 'chargesMensuelles', label: 'Charges mensuelles' },
  { key: 'enveloppeImprevus', label: 'Enveloppe imprévus' },
  { key: 'gestionGliPourcent', label: 'Gestion + GLI (%)' },
];

export function MontageFinancierForm({ montage, onSave }: MontageFinancierFormProps) {
  // Local state so typing is instant and the results update live; the parent
  // only sees the montage when the user explicitly submits (spec: "sauvegarde
  // explicite […] pas à chaque frappe").
  const [local, setLocal] = useState<MontageFinancier>(montage);

  // Resync when the parent hands down a new montage from an external source
  // (e.g. a post-conflict reload).
  useEffect(() => {
    setLocal(montage);
  }, [montage]);

  const resultat = calculMontageFinancier(local);

  function updateField(key: keyof MontageFinancier, value: number) {
    setLocal((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(local);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8 p-8">
      <div className="space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="block text-sm font-medium">
              {field.label}
            </label>
            <input
              id={field.key}
              type="number"
              step="0.01"
              value={local[field.key]}
              onChange={(e) => updateField(field.key, Number(e.target.value) || 0)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        ))}
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Enregistrer
        </button>
      </div>
      <div className="space-y-2 rounded border p-4">
        <h2 className="font-medium">Résultats</h2>
        <p>Mensualité banque : {resultat.mensualiteBanque.toFixed(2)} €</p>
        <p>Gestion + GLI : {resultat.gestionGli.toFixed(2)} €</p>
        <p>Total mensualité : {resultat.totalMensualite.toFixed(2)} €</p>
        <p>Cashflow : {resultat.cashflow.toFixed(2)} €</p>
        <p>Rendement brut : {resultat.rendementBrutPourcent.toFixed(2)}%</p>
        <p>Rendement net : {resultat.rendementNetPourcent.toFixed(2)}%</p>
      </div>
    </form>
  );
}
