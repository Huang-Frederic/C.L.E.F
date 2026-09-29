import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Nav } from './Nav';

const pathname = vi.hoisted(() => ({ current: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  vi.restoreAllMocks();
  pathname.current = '/';
  vi.stubGlobal('location', { href: '' } as unknown as Location);
});

describe('Nav', () => {
  it('links to every page of the app', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: 'Biens' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Référentiel loyers' })).toHaveAttribute('href', '/referentiel');
    expect(screen.getByRole('link', { name: 'Barème confort' })).toHaveAttribute('href', '/bareme-confort');
    expect(screen.getByRole('link', { name: 'Montage financier' })).toHaveAttribute('href', '/montage-financier');
    expect(screen.getByRole('link', { name: 'Emails' })).toHaveAttribute('href', '/emails');
  });

  it('logs out via POST /api/logout and redirects to /login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<Nav />);

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
    await waitFor(() => expect(window.location.href).toBe('/login'));
  });

  it('is hidden on the login page', () => {
    pathname.current = '/login';
    const { container } = render(<Nav />);
    expect(container).toBeEmptyDOMElement();
  });
});
