'use client';

import { DataPageShell } from '@/components/DataPageShell';
import { ReferentielTable } from '@/components/ReferentielTable';

export default function ReferentielPage() {
  return (
    <DataPageShell>
      {({ data, save }) => (
        <ReferentielTable
          rows={data.referentielLoyers}
          onSave={(referentielLoyers) => {
            // The result (success / conflict / error) is surfaced by the shell.
            void save({ ...data, referentielLoyers });
          }}
        />
      )}
    </DataPageShell>
  );
}
