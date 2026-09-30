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
          <div className="flex items-center justify-between p-3 pb-0 sm:p-8 sm:pb-0">
            <ImportExportPanel
              onImportError={setImportErrors}
              onImportSuccess={() => window.location.reload()}
            />
          </div>
          {importErrors && (
            <div className="mx-3 mt-3 border-l-4 border-warn bg-warn/[0.08] p-3 text-xs text-warn sm:mx-8 sm:mt-4 sm:p-4 sm:text-sm">
              <p className="font-medium">Import refusé :</p>
              <ul className="list-disc pl-5">
                {importErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="px-3 pt-3 sm:px-8 sm:pt-4">
            <SettingsPanel
              settings={data.settings}
              onSave={(settings) => {
                void save({ ...data, settings });
              }}
            />
          </div>
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
        </>
      )}
    </DataPageShell>
  );
}
