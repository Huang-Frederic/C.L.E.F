import './globals.css';
import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav';

export const metadata = {
  title: 'CLEF — Calcul de Loyer, Emprunt & Financement',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* `Nav` hides itself on /login, the only unauthenticated page. */}
        <Nav />
        {children}
      </body>
    </html>
  );
}
