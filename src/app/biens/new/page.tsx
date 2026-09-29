'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DataPageShell, type DataPageContext } from '@/components/DataPageShell';
import { BienForm } from '@/components/BienForm';
import { createEmptyBien } from '@/lib/defaultData';
import { randomUUID } from '@/lib/randomId';
import type { Bien } from '@/lib/types';

function NewBienEditor({ data, save }: DataPageContext) {
  const router = useRouter();
  // Seed the new bien from the user-editable default credit settings.
  const emptyBien = useMemo(() => createEmptyBien(randomUUID(), data.settings), [data.settings]);

  async function handleSubmit(bien: Bien) {
    const result = await save({ ...data, biens: [...data.biens, bien] });
    // Only leave the form once the save really succeeded: on a conflict or an
    // error the user must keep their input and see the modal / error banner.
    if (result.ok === true) router.push('/');
  }

  return (
    <BienForm
      bien={emptyBien}
      referentielLoyers={data.referentielLoyers}
      baremeConfort={data.baremeConfort}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/')}
    />
  );
}

export default function NewBienPage() {
  return <DataPageShell>{(ctx) => <NewBienEditor {...ctx} />}</DataPageShell>;
}
