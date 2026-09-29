'use client';

import { DataPageShell } from '@/components/DataPageShell';
import { EmailTemplateList } from '@/components/EmailTemplateList';

export default function EmailsPage() {
  return (
    <DataPageShell>
      {({ data, save }) => (
        <EmailTemplateList
          templates={data.emailTemplates}
          onSave={(emailTemplates) => {
            // The result (success / conflict / error) is surfaced by the shell.
            void save({ ...data, emailTemplates });
          }}
        />
      )}
    </DataPageShell>
  );
}
