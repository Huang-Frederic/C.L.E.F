'use client';

import { useState, type FormEvent } from 'react';
import type { Bien, ReferentielLoyer, BaremeConfortItem } from '@/lib/types';
import { ConfortCalculator } from './ConfortCalculator';

interface BienFormProps {
  bien: Bien;
  referentielLoyers: ReferentielLoyer[];
  baremeConfort: BaremeConfortItem[];
  onSubmit: (bien: Bien) => void;
  onCancel: () => void;
}

export function BienForm({ bien, referentielLoyers, baremeConfort, onSubmit, onCancel }: BienFormProps) {
  const [form, setForm] = useState<Bien>(bien);
  const villes = Array.from(new Set(referentielLoyers.map((r) => r.ville)));
  const typesPourVille = referentielLoyers.filter((r) => r.ville === form.lieu).map((r) => r.typePiece);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-8">
      <div>
        <label htmlFor="lienAnnonce" className="block text-sm font-medium">
          Lien annonce
        </label>
        <input
          id="lienAnnonce"
          value={form.lienAnnonce}
          onChange={(e) => setForm({ ...form, lienAnnonce: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="lieu" className="block text-sm font-medium">
          Ville
        </label>
        <select
          id="lieu"
          value={form.lieu}
          onChange={(e) => setForm({ ...form, lieu: e.target.value, typePiece: '' })}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">—</option>
          {villes.map((ville) => (
            <option key={ville} value={ville}>
              {ville}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="typePiece" className="block text-sm font-medium">
          Type
        </label>
        <select
          id="typePiece"
          value={form.typePiece}
          onChange={(e) => setForm({ ...form, typePiece: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">—</option>
          {typesPourVille.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="surfaceSol" className="block text-sm font-medium">
          Surface sol (m2)
        </label>
        <input
          id="surfaceSol"
          type="number"
          value={form.surfaceSol}
          onChange={(e) => setForm({ ...form, surfaceSol: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <ConfortCalculator
        bareme={baremeConfort}
        equipements={form.equipements ?? {}}
        onChange={(surfaceConfort, equipements) => setForm({ ...form, surfaceConfort, equipements })}
      />
      <div>
        <label htmlFor="prixAchat" className="block text-sm font-medium">
          Prix achat
        </label>
        <input
          id="prixAchat"
          type="number"
          value={form.prixAchat}
          onChange={(e) => setForm({ ...form, prixAchat: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="prixTravaux" className="block text-sm font-medium">
          Prix travaux
        </label>
        <input
          id="prixTravaux"
          type="number"
          value={form.prixTravaux}
          onChange={(e) => setForm({ ...form, prixTravaux: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="tauxCredit" className="block text-sm font-medium">
          Taux crédit (%)
        </label>
        <input
          id="tauxCredit"
          type="number"
          step="0.1"
          value={form.tauxCredit}
          onChange={(e) => setForm({ ...form, tauxCredit: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="taxeFonciere" className="block text-sm font-medium">
          Taxe foncière /an
        </label>
        <input
          id="taxeFonciere"
          type="number"
          value={form.taxeFonciere}
          onChange={(e) => setForm({ ...form, taxeFonciere: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="chargesCopro" className="block text-sm font-medium">
          Charges copro /an
        </label>
        <input
          id="chargesCopro"
          type="number"
          value={form.chargesCopro}
          onChange={(e) => setForm({ ...form, chargesCopro: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="autresCharges" className="block text-sm font-medium">
          Autres charges /an
        </label>
        <input
          id="autresCharges"
          type="number"
          value={form.autresCharges}
          onChange={(e) => setForm({ ...form, autresCharges: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="dureeCreditAnnees" className="block text-sm font-medium">
          Durée crédit (années)
        </label>
        <input
          id="dureeCreditAnnees"
          type="number"
          value={form.dureeCreditAnnees}
          onChange={(e) => setForm({ ...form, dureeCreditAnnees: Number(e.target.value) || 0 })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="loyerM2Override" className="block text-sm font-medium">
          Loyer €/m² (surcharge manuelle, laisser vide pour utiliser le référentiel)
        </label>
        <input
          id="loyerM2Override"
          type="number"
          step="0.1"
          value={form.loyerM2Override ?? ''}
          onChange={(e) =>
            setForm({ ...form, loyerM2Override: e.target.value === '' ? null : Number(e.target.value) })
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="classeEnergie" className="block text-sm font-medium">
          Classe énergie
        </label>
        <input
          id="classeEnergie"
          value={form.classeEnergie}
          onChange={(e) => setForm({ ...form, classeEnergie: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="dateVisite" className="block text-sm font-medium">
          Date de visite
        </label>
        <input
          id="dateVisite"
          type="date"
          value={form.dateVisite ?? ''}
          onChange={(e) => setForm({ ...form, dateVisite: e.target.value === '' ? null : e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="dateVente" className="block text-sm font-medium">
          Date de vente
        </label>
        <input
          id="dateVente"
          type="date"
          value={form.dateVente ?? ''}
          onChange={(e) => setForm({ ...form, dateVente: e.target.value === '' ? null : e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="commentaireAntho" className="block text-sm font-medium">
          Commentaire Antho
        </label>
        <textarea
          id="commentaireAntho"
          value={form.commentaireAntho}
          onChange={(e) => setForm({ ...form, commentaireAntho: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="commentaireGilly" className="block text-sm font-medium">
          Commentaire Gilly
        </label>
        <textarea
          id="commentaireGilly"
          value={form.commentaireGilly}
          onChange={(e) => setForm({ ...form, commentaireGilly: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="commentaireDecision" className="block text-sm font-medium">
          Commentaire décision
        </label>
        <textarea
          id="commentaireDecision"
          value={form.commentaireDecision}
          onChange={(e) => setForm({ ...form, commentaireDecision: e.target.value })}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Enregistrer
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
          Annuler
        </button>
      </div>
    </form>
  );
}
