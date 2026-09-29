'use client';

import { useDataStore } from '@/hooks/useDataStore';
import { EmailTemplateList } from '@/components/EmailTemplateList';
import type { EmailTemplate } from '@/lib/types';

export default function EmailsPage() {
  const { data, loading, error, save } = useDataStore();

  if (loading) return <main className="p-8">Chargement…</main>;
  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!data) return null;

  async function handleChange(emailTemplates: EmailTemplate[]) {
    await save({ ...data!, emailTemplates });
  }

  return <EmailTemplateList templates={data.emailTemplates} onChange={handleChange} />;
}
