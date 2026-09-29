'use client';

import { useRouter, useParams } from 'next/navigation';
import { DataPageShell, type DataPageContext } from '@/components/DataPageShell';
import { BienForm } from '@/components/BienForm';
import type { Bien } from '@/lib/types';

function BienEditor({ data, save }: DataPageContext) {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const bien = data.biens.find((b) => b.id === params.id);
  if (!bien) return <p className="p-8">Bien introuvable.</p>;

  async function handleSubmit(updated: Bien) {
    const result = await save({
      ...data,
      biens: data.biens.map((b) => (b.id === updated.id ? updated : b)),
    });
    // Only leave the form once the save really succeeded: on a conflict or an
    // error the user must keep their input and see the modal / error banner.
    if (result.ok === true) router.push('/');
  }

  return (
    <BienForm
      bien={bien}
      referentielLoyers={data.referentielLoyers}
      baremeConfort={data.baremeConfort}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/')}
    />
  );
}

export default function BienDetailPage() {
  return <DataPageShell>{(ctx) => <BienEditor {...ctx} />}</DataPageShell>;
}
