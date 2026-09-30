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
  const [open, setOpen] = useState(false);

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
    <>
      {/* Desktop: folder-tab bar. Below md it's replaced by the FAB + side
          drawer below so a phone doesn't spend a whole row on nav. */}
      <nav
        aria-label="Navigation principale"
        className="hidden items-end gap-1 overflow-x-auto bg-paper-raised px-6 pt-4 md:flex"
      >
        <span className="mb-2 mr-4 shrink-0 font-serif text-lg text-accent">CLEF</span>
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'shrink-0 rounded-t-sm bg-paper px-4 py-2 text-sm font-medium text-ink'
                  : 'shrink-0 rounded-t-sm px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink'
              }
            >
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="ml-auto mb-2 shrink-0 rounded-sm border border-ink/20 px-3 py-1 text-sm text-ink-soft transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-50"
        >
          Se déconnecter
        </button>
      </nav>

      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-xl text-paper shadow-lg md:hidden"
      >
        {open ? '×' : '☰'}
      </button>

      {/* Drawer + backdrop only exist in the DOM while open, so closed-state
          markup never duplicates the desktop nav's links/logout button. */}
      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-ink/50 md:hidden"
          />
          <nav
            aria-label="Navigation mobile"
            className="fixed inset-y-0 left-0 z-40 w-64 max-w-[80%] space-y-1 overflow-y-auto bg-paper-raised p-4 shadow-lg md:hidden"
          >
            <span className="mb-4 block font-serif text-lg text-accent">CLEF</span>
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={
                    active
                      ? 'block rounded-sm bg-paper px-3 py-2 text-sm font-medium text-ink'
                      : 'block rounded-sm px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink'
                  }
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-4 w-full rounded-sm border border-ink/20 px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-50"
            >
              Se déconnecter
            </button>
          </nav>
        </>
      )}
    </>
  );
}
