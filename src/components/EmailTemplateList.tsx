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
    <form onSubmit={handleSubmit} className="space-y-4 p-3 sm:space-y-6 sm:p-8">
      <h1 className="border-b border-line pb-2 font-serif text-lg text-ink sm:pb-4 sm:text-2xl">Templates email</h1>
      {local.map((template, index) => (
        <div key={index} className="space-y-2 border-t-2 border-ink bg-paper-raised p-3 sm:space-y-3 sm:p-5">
          <input
            aria-label={`Titre du modèle ${index + 1}`}
            value={template.titre}
            onChange={(e) => updateTemplate(index, { titre: e.target.value })}
            className="w-full border-0 border-b border-line bg-transparent py-1 font-serif text-base text-ink focus:border-accent focus:outline-none focus:ring-0 sm:text-lg"
            placeholder="Titre"
          />
          <textarea
            aria-label={`Corps du modèle ${index + 1}`}
            value={template.corps}
            onChange={(e) => updateTemplate(index, { corps: e.target.value })}
            className="h-28 w-full border border-line bg-paper p-2.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-0 sm:h-40 sm:p-3 sm:text-sm"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => copyToClipboard(template.corps)}
              className="border border-line px-3 py-1 text-xs text-ink-soft hover:border-ink-soft hover:text-ink sm:px-4 sm:py-1.5 sm:text-sm"
            >
              Copier
            </button>
            <button
              type="button"
              onClick={() => removeTemplate(index)}
              className="px-3 py-1 text-xs text-warn hover:underline sm:px-4 sm:py-1.5 sm:text-sm"
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addTemplate}
          className="border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-ink-soft hover:text-ink sm:px-4 sm:py-2 sm:text-sm"
        >
          Ajouter un modèle
        </button>
        <button
          type="submit"
          className="bg-accent px-3 py-1.5 text-xs font-medium text-paper hover:bg-accent-dark sm:px-4 sm:py-2 sm:text-sm"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}
