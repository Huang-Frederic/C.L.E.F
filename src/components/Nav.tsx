'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/', label: 'Biens' },
  { href: '/referentiel', label: 'Référentiel loyers' },
  { href: '/bareme-confort', label: 'Barème confort' },
  { href: '/montage-financier', label: 'Montage financier' },
  { href: '/emails', label: 'Emails' },
];

export function Nav() {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  // `/login` is the only unauthenticated page: it must not show the nav.
  if (pathname === '/login') return null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <nav aria-label="Navigation principale" className="flex items-center gap-4 border-b bg-slate-50 px-8 py-3 text-sm">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? 'page' : undefined}
          className={pathname === link.href ? 'font-semibold underline' : 'hover:underline'}
        >
          {link.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="ml-auto rounded border px-3 py-1 disabled:opacity-50"
      >
        Se déconnecter
      </button>
    </nav>
  );
}
