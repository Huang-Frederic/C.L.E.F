'use client';

import { DataPageShell } from '@/components/DataPageShell';
import { MontageFinancierForm } from '@/components/MontageFinancierForm';

export default function MontageFinancierPage() {
  return (
    <DataPageShell>
      {({ data, save }) => (
        <MontageFinancierForm
          montage={data.montageFinancier}
          onSave={(montageFinancier) => {
            // The result (success / conflict / error) is surfaced by the shell.
            void save({ ...data, montageFinancier });
          }}
        />
      )}
    </DataPageShell>
  );
}
