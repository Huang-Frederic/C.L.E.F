'use client';

import type { EmailTemplate } from '@/lib/types';

interface EmailTemplateListProps {
  templates: EmailTemplate[];
  onChange: (templates: EmailTemplate[]) => void;
}

export function EmailTemplateList({ templates, onChange }: EmailTemplateListProps) {
  function updateTemplate(index: number, patch: Partial<EmailTemplate>) {
    onChange(templates.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTemplate() {
    onChange([...templates, { titre: '', corps: '' }]);
  }

  async function copyToClipboard(corps: string) {
    await navigator.clipboard.writeText(corps);
  }

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-xl font-semibold">Templates email</h1>
      {templates.map((template, index) => (
        <div key={index} className="space-y-2 rounded border p-4">
          <input
            value={template.titre}
            onChange={(e) => updateTemplate(index, { titre: e.target.value })}
            className="w-full rounded border px-3 py-2 font-medium"
            placeholder="Titre"
          />
          <textarea
            value={template.corps}
            onChange={(e) => updateTemplate(index, { corps: e.target.value })}
            className="h-40 w-full rounded border px-3 py-2"
          />
          <button onClick={() => copyToClipboard(template.corps)} className="rounded border px-4 py-2">
            Copier
          </button>
        </div>
      ))}
      <button onClick={addTemplate} className="rounded bg-slate-900 px-4 py-2 text-white">
        Ajouter un modèle
      </button>
    </div>
  );
}
