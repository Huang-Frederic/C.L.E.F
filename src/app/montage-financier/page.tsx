'use client';

import { useDataStore } from '@/hooks/useDataStore';
import { MontageFinancierForm } from '@/components/MontageFinancierForm';
import type { MontageFinancier } from '@/lib/types';

export default function MontageFinancierPage() {
  const { data, loading, error, save } = useDataStore();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleChange(montageFinancier: MontageFinancier) {
    await save({ ...data!, montageFinancier });
  }

  return <MontageFinancierForm montage={data.montageFinancier} onChange={handleChange} />;
}
