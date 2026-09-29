'use client';

import { useDataStore } from '@/hooks/useDataStore';
import { BaremeConfortTable } from '@/components/BaremeConfortTable';
import type { BaremeConfortItem } from '@/lib/types';

export default function BaremeConfortPage() {
  const { data, loading, error, save } = useDataStore();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleChange(baremeConfort: BaremeConfortItem[]) {
    await save({ ...data!, baremeConfort });
  }

  return <BaremeConfortTable rows={data.baremeConfort} onChange={handleChange} />;
}
