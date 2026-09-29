import './globals.css';
import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav';
import { DataStoreProvider } from '@/hooks/useDataStoreContext';

export const metadata = {
  title: 'CLEF — Calcul de Loyer, Emprunt & Financement',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* Mounted once here so the Drive blob is fetched once per session,
            not once per page: this provider survives client-side navigation
            since Next.js doesn't remount the root layout between pages. */}
        <DataStoreProvider>
          {/* `Nav` hides itself on /login, the only unauthenticated page. */}
          <Nav />
          {children}
        </DataStoreProvider>
      </body>
    </html>
  );
}
