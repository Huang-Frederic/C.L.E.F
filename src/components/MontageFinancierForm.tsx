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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-3 sm:gap-8 sm:p-8 md:grid-cols-2">
      <div className="space-y-3 sm:space-y-4">
        <h1 className="border-b border-line pb-2 font-serif text-lg text-ink sm:pb-4 sm:text-2xl">Montage financier</h1>
        {/* Two fields per row below sm: (each is just a short number input) halves
            the height of this 10-field list instead of stacking one per line. */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:block sm:space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className="block text-xs text-ink-soft sm:text-sm">
                {field.label}
              </label>
              <input
                id={field.key}
                type="number"
                step="0.01"
                value={local[field.key]}
                onChange={(e) => updateField(field.key, Number(e.target.value) || 0)}
                className="mt-1 w-full border-0 border-b border-line bg-transparent py-1 text-right font-mono tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-0 sm:mt-2 sm:py-1.5"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="bg-accent px-3 py-1.5 text-xs font-medium text-paper hover:bg-accent-dark sm:px-4 sm:py-2 sm:text-sm"
        >
          Enregistrer
        </button>
      </div>
      <dl className="h-fit space-y-1.5 border border-line bg-paper-raised p-3 text-xs sm:space-y-2 sm:p-6 sm:text-sm">
        <h2 className="mb-2 font-serif text-base text-ink sm:mb-3 sm:text-lg">Résultats</h2>
        <div className="flex justify-between border-b border-ink/10 pb-1.5 sm:pb-2">
          <dt className="text-ink-soft">Mensualité banque</dt>
          <dd className="font-mono tabular-nums text-ink">{resultat.mensualiteBanque.toFixed(2)} €</dd>
        </div>
        <div className="flex justify-between border-b border-ink/10 pb-1.5 sm:pb-2">
          <dt className="text-ink-soft">Gestion + GLI</dt>
          <dd className="font-mono tabular-nums text-ink">{resultat.gestionGli.toFixed(2)} €</dd>
        </div>
        <div className="flex justify-between border-b border-ink/10 pb-1.5 sm:pb-2">
          <dt className="text-ink-soft">Total mensualité</dt>
          <dd className="font-mono tabular-nums text-ink">{resultat.totalMensualite.toFixed(2)} €</dd>
        </div>
        <div className="flex justify-between border-b border-ink/10 pb-1.5 sm:pb-2">
          <dt className="text-ink-soft">Cashflow</dt>
          <dd className={`font-mono tabular-nums ${resultat.cashflow >= 0 ? 'text-accent-dark' : 'text-warn'}`}>
            {resultat.cashflow.toFixed(2)} €
          </dd>
        </div>
        <div className="flex justify-between border-b border-ink/10 pb-1.5 sm:pb-2">
          <dt className="text-ink-soft">Rendement brut</dt>
          <dd className="font-mono tabular-nums text-ink">{resultat.rendementBrutPourcent.toFixed(2)}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">Rendement net</dt>
          <dd className="font-mono tabular-nums text-ink">{resultat.rendementNetPourcent.toFixed(2)}%</dd>
        </div>
      </dl>
    </form>
  );
}
