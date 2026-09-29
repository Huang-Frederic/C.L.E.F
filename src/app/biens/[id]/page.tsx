'use client';

import { useRouter, useParams } from 'next/navigation';
import { useDataStore } from '@/hooks/useDataStore';
import { BienForm } from '@/components/BienForm';
import type { Bien } from '@/lib/types';

export default function BienDetailPage() {
  const { data, loading, error, save } = useDataStore();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  const bien = data.biens.find((b) => b.id === params.id);
  if (!bien) return <main className="p-8">Bien introuvable.</main>;

  async function handleSubmit(updated: Bien) {
    await save({ ...data!, biens: data!.biens.map((b) => (b.id === updated.id ? updated : b)) });
    router.push('/');
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
