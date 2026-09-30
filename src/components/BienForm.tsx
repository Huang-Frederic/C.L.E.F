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

const label = 'block text-xs text-ink-soft sm:text-sm';
const input =
  'mt-1 w-full border-0 border-b border-line bg-transparent py-1 text-sm text-ink focus:border-accent focus:outline-none focus:ring-0 sm:mt-2 sm:py-1.5 sm:text-base';
const section = 'space-y-3 border-t border-line pt-4 sm:space-y-4 sm:pt-6';
const sectionTitle = 'font-serif text-base text-ink sm:text-lg';

export function BienForm({ bien, referentielLoyers, baremeConfort, onSubmit, onCancel }: BienFormProps) {
  const [form, setForm] = useState<Bien>(bien);
  const villes = Array.from(new Set(referentielLoyers.map((r) => r.ville)));
  const typesPourVille = referentielLoyers.filter((r) => r.ville === form.lieu).map((r) => r.typePiece);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-3 p-3 sm:space-y-4 sm:p-8">
      <h1 className="font-serif text-lg text-ink sm:text-2xl">
        {form.lieu ? `${form.typePiece} ${form.lieu}` : 'Nouveau bien'}
      </h1>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <label htmlFor="lienAnnonce" className={label}>
            Lien annonce
          </label>
          <input
            id="lienAnnonce"
            value={form.lienAnnonce}
            onChange={(e) => setForm({ ...form, lienAnnonce: e.target.value })}
            className={input}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <label htmlFor="lieu" className={label}>
              Ville
            </label>
            <select
              id="lieu"
              value={form.lieu}
              onChange={(e) => setForm({ ...form, lieu: e.target.value, typePiece: '' })}
              className={input}
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
            <label htmlFor="typePiece" className={label}>
              Type
            </label>
            <select
              id="typePiece"
              value={form.typePiece}
              onChange={(e) => setForm({ ...form, typePiece: e.target.value })}
              className={input}
            >
              <option value="">—</option>
              {typesPourVille.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={section}>
        <h2 className={sectionTitle}>Surfaces &amp; confort</h2>
        <div>
          <label htmlFor="surfaceSol" className={label}>
            Surface sol (m2)
          </label>
          <input
            id="surfaceSol"
            type="number"
            value={form.surfaceSol}
            onChange={(e) => setForm({ ...form, surfaceSol: Number(e.target.value) || 0 })}
            className={input}
          />
        </div>
        <ConfortCalculator
          bareme={baremeConfort}
          equipements={form.equipements ?? {}}
          onChange={(surfaceConfort, equipements) => setForm({ ...form, surfaceConfort, equipements })}
        />
        <div>
          <label htmlFor="surfaceConfort" className={label}>
            Surface confort (m2) — surcharge manuelle
          </label>
          <input
            id="surfaceConfort"
            type="number"
            step="0.1"
            value={form.surfaceConfort}
            // Editing this field directly means "I'm overriding the computed
            // value": `equipements: null` is the documented marker for that.
            onChange={(e) => setForm({ ...form, surfaceConfort: Number(e.target.value) || 0, equipements: null })}
            className={input}
          />
          <p className="mt-1 text-sm text-ink-soft">
            {form.equipements === null
              ? 'Valeur saisie manuellement : modifier un équipement ci-dessus recalculera la surface confort.'
              : 'Calculée à partir des équipements ci-dessus ; la modifier ici passe en surcharge manuelle.'}
          </p>
        </div>
      </div>

      <div className={section}>
        <h2 className={sectionTitle}>Financier</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <label htmlFor="prixAchat" className={label}>
              Prix achat
            </label>
            <input
              id="prixAchat"
              type="number"
              value={form.prixAchat}
              onChange={(e) => setForm({ ...form, prixAchat: Number(e.target.value) || 0 })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="prixTravaux" className={label}>
              Prix travaux
            </label>
            <input
              id="prixTravaux"
              type="number"
              value={form.prixTravaux}
              onChange={(e) => setForm({ ...form, prixTravaux: Number(e.target.value) || 0 })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="tauxCredit" className={label}>
              Taux crédit (%)
            </label>
            <input
              id="tauxCredit"
              type="number"
              step="0.1"
              value={form.tauxCredit}
              onChange={(e) => setForm({ ...form, tauxCredit: Number(e.target.value) || 0 })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="dureeCreditAnnees" className={label}>
              Durée crédit (années)
            </label>
            <input
              id="dureeCreditAnnees"
              type="number"
              value={form.dureeCreditAnnees}
              onChange={(e) => setForm({ ...form, dureeCreditAnnees: Number(e.target.value) || 0 })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="taxeFonciere" className={label}>
              Taxe foncière /an
            </label>
            <input
              id="taxeFonciere"
              type="number"
              value={form.taxeFonciere}
              onChange={(e) => setForm({ ...form, taxeFonciere: Number(e.target.value) || 0 })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="chargesCopro" className={label}>
              Charges copro /an
            </label>
            <input
              id="chargesCopro"
              type="number"
              value={form.chargesCopro}
              onChange={(e) => setForm({ ...form, chargesCopro: Number(e.target.value) || 0 })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="autresCharges" className={label}>
              Autres charges /an
            </label>
            <input
              id="autresCharges"
              type="number"
              value={form.autresCharges}
              onChange={(e) => setForm({ ...form, autresCharges: Number(e.target.value) || 0 })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="loyerM2Override" className={label}>
              Loyer €/m² (surcharge, sinon référentiel)
            </label>
            <input
              id="loyerM2Override"
              type="number"
              step="0.1"
              value={form.loyerM2Override ?? ''}
              onChange={(e) =>
                setForm({ ...form, loyerM2Override: e.target.value === '' ? null : Number(e.target.value) })
              }
              className={input}
            />
          </div>
        </div>
      </div>

      <div className={section}>
        <h2 className={sectionTitle}>Suivi</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div>
            <label htmlFor="classeEnergie" className={label}>
              Classe énergie
            </label>
            <input
              id="classeEnergie"
              value={form.classeEnergie}
              onChange={(e) => setForm({ ...form, classeEnergie: e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="dateVisite" className={label}>
              Date de visite
            </label>
            <input
              id="dateVisite"
              type="date"
              value={form.dateVisite ?? ''}
              onChange={(e) => setForm({ ...form, dateVisite: e.target.value === '' ? null : e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="dateVente" className={label}>
              Date de vente
            </label>
            <input
              id="dateVente"
              type="date"
              value={form.dateVente ?? ''}
              onChange={(e) => setForm({ ...form, dateVente: e.target.value === '' ? null : e.target.value })}
              className={input}
            />
          </div>
        </div>
      </div>

      <div className={section}>
        <h2 className={sectionTitle}>Commentaires</h2>
        <div>
          <label htmlFor="commentaireAntho" className={label}>
            Commentaire Antho
          </label>
          <textarea
            id="commentaireAntho"
            value={form.commentaireAntho}
            onChange={(e) => setForm({ ...form, commentaireAntho: e.target.value })}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="commentaireGilly" className={label}>
            Commentaire Gilly
          </label>
          <textarea
            id="commentaireGilly"
            value={form.commentaireGilly}
            onChange={(e) => setForm({ ...form, commentaireGilly: e.target.value })}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="commentaireDecision" className={label}>
            Commentaire décision
          </label>
          <textarea
            id="commentaireDecision"
            value={form.commentaireDecision}
            onChange={(e) => setForm({ ...form, commentaireDecision: e.target.value })}
            className={input}
          />
        </div>
      </div>

      <div className="flex gap-3 border-t border-line pt-4 sm:pt-6">
        <button
          type="submit"
          className="bg-accent px-3 py-1.5 text-xs font-medium text-paper hover:bg-accent-dark sm:px-4 sm:py-2 sm:text-sm"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-ink-soft hover:text-ink sm:px-4 sm:py-2 sm:text-sm"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
