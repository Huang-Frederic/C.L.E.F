import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('shows a closed mobile menu button by default', () => {
    render(<Nav />);
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Navigation mobile' })).not.toBeInTheDocument();
  });

  it('opens a side drawer listing every page when the menu button is clicked', async () => {
    render(<Nav />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true');
    const drawer = screen.getByRole('navigation', { name: 'Navigation mobile' });
    expect(within(drawer).getByRole('link', { name: 'Biens' })).toHaveAttribute('href', '/');
    expect(within(drawer).getByRole('link', { name: 'Référentiel loyers' })).toHaveAttribute('href', '/referentiel');
    expect(within(drawer).getByRole('link', { name: 'Barème confort' })).toHaveAttribute('href', '/bareme-confort');
    expect(within(drawer).getByRole('link', { name: 'Montage financier' })).toHaveAttribute(
      'href',
      '/montage-financier'
    );
    expect(within(drawer).getByRole('link', { name: 'Emails' })).toHaveAttribute('href', '/emails');
  });

  it('closes the drawer when the backdrop is clicked', async () => {
    render(<Nav />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fermer le menu' }));
    expect(screen.queryByRole('navigation', { name: 'Navigation mobile' })).not.toBeInTheDocument();
  });

  it('closes the drawer after navigating to a page from it', async () => {
    // jsdom logs a "Not implemented: navigation" error when a real <a href>
    // is clicked; harmless here since we only assert the drawer's onClick
    // (setOpen(false)) ran, not that the browser actually navigated.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Nav />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const drawer = screen.getByRole('navigation', { name: 'Navigation mobile' });
    await userEvent.click(within(drawer).getByRole('link', { name: 'Référentiel loyers' }));
    expect(screen.queryByRole('navigation', { name: 'Navigation mobile' })).not.toBeInTheDocument();
  });

  it('can log out from within the mobile drawer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<Nav />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const drawer = screen.getByRole('navigation', { name: 'Navigation mobile' });
    await userEvent.click(within(drawer).getByRole('button', { name: 'Se déconnecter' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
    await waitFor(() => expect(window.location.href).toBe('/login'));
  });
});
