'use client';

import { useDataStore } from '@/hooks/useDataStore';
import { ReferentielTable } from '@/components/ReferentielTable';
import type { ReferentielLoyer } from '@/lib/types';

export default function ReferentielPage() {
  const { data, loading, error, save } = useDataStore();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleChange(referentielLoyers: ReferentielLoyer[]) {
    await save({ ...data!, referentielLoyers });
  }

  return <ReferentielTable rows={data.referentielLoyers} onChange={handleChange} />;
}
