'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/hooks/useDataStore';
import { BienTable } from '@/components/BienTable';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ImportExportPanel } from '@/components/ImportExportPanel';
import { ConflictModal } from '@/components/ConflictModal';
import type { Settings } from '@/lib/types';

export default function HomePage() {
  const { data, loading, error, conflict, save, resolveConflictReload } = useDataStore();
  const router = useRouter();
  const [importErrors, setImportErrors] = useState<string[] | null>(null);

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  function handleAdd() {
    router.push('/biens/new');
  }

  async function handleDelete(id: string) {
    await save({ ...data!, biens: data!.biens.filter((b) => b.id !== id) });
  }

  async function handleSettingsChange(settings: Settings) {
    await save({ ...data!, settings });
  }

  async function handleForceOverwrite() {
    await save(data!, true);
  }

  return (
    <main>
      <div className="flex items-center justify-between p-8 pb-0">
        <ImportExportPanel onImportError={setImportErrors} onImportSuccess={() => window.location.reload()} />
      </div>
      {importErrors && (
        <div className="mx-8 mt-4 rounded border border-red-400 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Import refusé :</p>
          <ul className="list-disc pl-5">
            {importErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <BienTable
        biens={data.biens}
        referentielLoyers={data.referentielLoyers}
        settings={data.settings}
        onAdd={handleAdd}
        onDelete={handleDelete}
      />
      <div className="px-8 pb-8">
        <SettingsPanel settings={data.settings} onChange={handleSettingsChange} />
      </div>
      {conflict && <ConflictModal onReload={resolveConflictReload} onForce={handleForceOverwrite} />}
    </main>
  );
}
