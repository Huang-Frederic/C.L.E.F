'use client';

import { useRouter } from 'next/navigation';
import { useDataStore } from '@/hooks/useDataStore';
import { BienTable } from '@/components/BienTable';

export default function HomePage() {
  const { data, loading, error, save } = useDataStore();
  const router = useRouter();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  function handleAdd() {
    router.push('/biens/new');
  }

  async function handleDelete(id: string) {
    await save({ ...data, biens: data.biens.filter((b) => b.id !== id) });
  }

  return (
    <BienTable
      biens={data.biens}
      referentielLoyers={data.referentielLoyers}
      settings={data.settings}
      onAdd={handleAdd}
      onDelete={handleDelete}
    />
  );
}
