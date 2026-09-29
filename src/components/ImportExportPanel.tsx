'use client';

import type { ChangeEvent } from 'react';

interface ImportExportPanelProps {
  onImportError: (errors: string[]) => void;
  onImportSuccess?: () => void;
}

const CONFIRM_MESSAGE =
  "Importer ce fichier remplacera TOUTES les données partagées (biens, référentiel, barème, emails, montage, paramètres) et cette action est irréversible. Continuer ?";

export function ImportExportPanel({ onImportError, onImportSuccess }: ImportExportPanelProps) {
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    // Import overwrites the whole shared dataset for everyone: ask first.
    if (!window.confirm(CONFIRM_MESSAGE)) {
      // Reset so picking the same file again re-triggers the change event.
      input.value = '';
      return;
    }
    const formData = new FormData();
    formData.set('file', file);
    const res = await fetch('/api/import', { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json();
      onImportError(body.details ?? [body.error ?? 'Import invalide.']);
      return;
    }
    onImportSuccess?.();
  }

  return (
    <div className="flex items-center gap-4">
      <a href="/api/export" className="rounded border px-4 py-2">
        Exporter en Excel
      </a>
      <label className="rounded border px-4 py-2">
        Importer un Excel
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Importer un Excel"
        />
      </label>
    </div>
  );
}
