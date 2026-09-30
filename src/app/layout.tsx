import './globals.css';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { Nav } from '@/components/Nav';
import { DataStoreProvider } from '@/hooks/useDataStoreContext';

// Self-hosted (latin subset, vendored under ./fonts) instead of next/font/google:
// that loader fetches from Google's servers at build time, and that fetch failed
// on Vercel's build machine (unrelated to this app's code). Local files remove
// the network dependency entirely, so every build is reproducible offline.
const sourceSerif = localFont({
  src: './fonts/source-serif-4-400.woff2',
  weight: '400',
  variable: '--font-source-serif',
  display: 'swap',
});
// IBM Plex Sans' 400/500/600 all resolve to the same file from Google Fonts —
// it's a single variable-weight font, so one file with a weight range suffices.
const plexSans = localFont({
  src: './fonts/ibm-plex-sans-variable.woff2',
  weight: '400 600',
  variable: '--font-plex-sans',
  display: 'swap',
});
const plexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-mono-500.woff2', weight: '500', style: 'normal' },
  ],
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
