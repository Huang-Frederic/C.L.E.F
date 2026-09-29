'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Settings } from '@/lib/types';

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  // Local state mirrors `settings` so each keystroke is reflected immediately,
  // even if the parent doesn't feed the updated value back into `settings`
  // synchronously (e.g. while a save is in flight).
  const [local, setLocal] = useState<Settings>(settings);

  // Resync whenever the parent hands us a new `settings` object from an
  // external source (e.g. a post-conflict reload) so we don't keep echoing a
  // stale, never-saved local edit on top of freshly-reloaded data.
  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  function handleFieldChange(field: keyof Settings, value: number) {
    setLocal((current) => ({ ...current, [field]: value }));
  }

  // Explicit save only (spec: "sauvegarde explicite […] pas à chaque frappe").
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(local);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border p-4">
      <h2 className="font-medium">Paramètres</h2>
      <div>
        <label htmlFor="objectifRentabilitePourcent" className="block text-sm font-medium">
          Objectif rentabilité (%)
        </label>
        <input
          id="objectifRentabilitePourcent"
          type="number"
          step="0.1"
          value={local.objectifRentabilitePourcent}
          onChange={(e) =>
            handleFieldChange('objectifRentabilitePourcent', Number(e.target.value) || 0)
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="tauxCreditParDefaut" className="block text-sm font-medium">
          Taux crédit par défaut (%)
        </label>
        <input
          id="tauxCreditParDefaut"
          type="number"
          step="0.1"
          value={local.tauxCreditParDefaut}
          onChange={(e) => handleFieldChange('tauxCreditParDefaut', Number(e.target.value) || 0)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="dureeCreditParDefautAnnees" className="block text-sm font-medium">
          Durée crédit par défaut (années)
        </label>
        <input
          id="dureeCreditParDefautAnnees"
          type="number"
          value={local.dureeCreditParDefautAnnees}
          onChange={(e) =>
            handleFieldChange('dureeCreditParDefautAnnees', Number(e.target.value) || 0)
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
        Enregistrer les paramètres
      </button>
    </form>
  );
}
