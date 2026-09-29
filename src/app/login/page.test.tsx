import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('location', { href: '' } as unknown as Location);
});

describe('LoginPage', () => {
  it('shows an error message when the password is wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Mot de passe incorrect.' }) })
    );
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Mot de passe incorrect.')).toBeInTheDocument();
  });

  it('redirects to / after a successful login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret-du-groupe');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => expect(window.location.href).toBe('/'));
  });
});
