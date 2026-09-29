'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataPageShell } from '@/components/DataPageShell';
import { BienTable } from '@/components/BienTable';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ImportExportPanel } from '@/components/ImportExportPanel';

export default function HomePage() {
  const router = useRouter();
  const [importErrors, setImportErrors] = useState<string[] | null>(null);

  return (
    <DataPageShell>
      {({ data, save }) => (
        <>
          <div className="flex items-center justify-between p-8 pb-0">
            <ImportExportPanel
              onImportError={setImportErrors}
              onImportSuccess={() => window.location.reload()}
            />
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
            onAdd={() => router.push('/biens/new')}
            onDelete={(id) => {
              // The result (success / conflict / error) is surfaced by the shell.
              void save({ ...data, biens: data.biens.filter((b) => b.id !== id) });
            }}
          />
          <div className="px-8 pb-8">
            <SettingsPanel
              settings={data.settings}
              onSave={(settings) => {
                void save({ ...data, settings });
              }}
            />
          </div>
        </>
      )}
    </DataPageShell>
  );
}
