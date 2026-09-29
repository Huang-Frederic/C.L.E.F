'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { EmailTemplate } from '@/lib/types';

interface EmailTemplateListProps {
  templates: EmailTemplate[];
  onSave: (templates: EmailTemplate[]) => void;
}

export function EmailTemplateList({ templates, onSave }: EmailTemplateListProps) {
  // Local state so typing is instant: the parent only sees the templates when
  // the user explicitly submits (spec: "sauvegarde explicite […] pas à chaque frappe").
  const [local, setLocal] = useState<EmailTemplate[]>(templates);

  // Resync when the parent hands down a new array from an external source
  // (e.g. a post-conflict reload) so we don't keep echoing stale templates.
  useEffect(() => {
    setLocal(templates);
  }, [templates]);

  function updateTemplate(index: number, patch: Partial<EmailTemplate>) {
    setLocal((current) => current.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function removeTemplate(index: number) {
    setLocal((current) => current.filter((_, i) => i !== index));
  }

  function addTemplate() {
    setLocal((current) => [...current, { titre: '', corps: '' }]);
  }

  async function copyToClipboard(corps: string) {
    await navigator.clipboard.writeText(corps);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(local);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-8">
      <h1 className="text-xl font-semibold">Templates email</h1>
      {local.map((template, index) => (
        <div key={index} className="space-y-2 rounded border p-4">
          <input
            aria-label={`Titre du modèle ${index + 1}`}
            value={template.titre}
            onChange={(e) => updateTemplate(index, { titre: e.target.value })}
            className="w-full rounded border px-3 py-2 font-medium"
            placeholder="Titre"
          />
          <textarea
            aria-label={`Corps du modèle ${index + 1}`}
            value={template.corps}
            onChange={(e) => updateTemplate(index, { corps: e.target.value })}
            className="h-40 w-full rounded border px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(template.corps)}
              className="rounded border px-4 py-2"
            >
              Copier
            </button>
            <button type="button" onClick={() => removeTemplate(index)} className="px-4 py-2 text-red-600">
              Supprimer
            </button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={addTemplate} className="rounded border px-4 py-2">
          Ajouter un modèle
        </button>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Enregistrer
        </button>
      </div>
    </form>
  );
}
