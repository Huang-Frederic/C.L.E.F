import './globals.css';
import type { ReactNode } from 'react';
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Nav } from '@/components/Nav';
import { DataStoreProvider } from '@/hooks/useDataStoreContext';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
});
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata = {
  title: 'CLEF — Calcul de Loyer, Emprunt & Financement',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sourceSerif.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
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
