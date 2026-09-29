'use client';

import { DataPageShell } from '@/components/DataPageShell';
import { BaremeConfortTable } from '@/components/BaremeConfortTable';

export default function BaremeConfortPage() {
  return (
    <DataPageShell>
      {({ data, save }) => (
        <BaremeConfortTable
          rows={data.baremeConfort}
          onSave={(baremeConfort) => {
            // The result (success / conflict / error) is surfaced by the shell.
            void save({ ...data, baremeConfort });
          }}
        />
      )}
    </DataPageShell>
  );
}
