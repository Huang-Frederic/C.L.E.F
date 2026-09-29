'use client';

import { useRouter } from 'next/navigation';
import { useDataStore } from '@/hooks/useDataStore';
import { BienForm } from '@/components/BienForm';
import { createEmptyBien } from '@/lib/defaultData';
import { randomUUID } from '@/lib/randomId';
import type { Bien } from '@/lib/types';

export default function NewBienPage() {
  const { data, loading, error, save } = useDataStore();
  const router = useRouter();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleSubmit(bien: Bien) {
    await save({ ...data!, biens: [...data!.biens, bien] });
    router.push('/');
  }

  return (
    <BienForm
      bien={createEmptyBien(randomUUID())}
      referentielLoyers={data.referentielLoyers}
      baremeConfort={data.baremeConfort}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/')}
    />
  );
}
