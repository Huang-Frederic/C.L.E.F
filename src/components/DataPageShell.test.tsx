import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DataPageShell, type DataPageContext } from './DataPageShell';
import { createDefaultDataStore } from '@/lib/defaultData';

beforeEach(() => {
  vi.restoreAllMocks();
});

/** A child with unsaved local input, like every real form in the app. */
function Child({ data, save }: DataPageContext) {
  const [value, setValue] = useState('');
  return (
    <div>
      <label htmlFor="champ">Champ</label>
      <input id="champ" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" onClick={() => void save({ ...data, emailTemplates: [{ titre: value, corps: '' }] })}>
        Enregistrer
      </button>
    </div>
  );
}

function stubFetch(...responses: unknown[]) {
  const mock = vi.fn();
  for (const response of responses) mock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('DataPageShell', () => {
  it('replaces the page only for a genuine initial-load failure', async () => {
    stubFetch({ ok: false, json: async () => ({}) });
    render(<DataPageShell>{(ctx) => <Child {...ctx} />}</DataPageShell>);

    expect(await screen.findByText('Impossible de charger les données.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Champ')).not.toBeInTheDocument();
  });

  // Regression: pages used to do `if (error) return <main>…</main>`, so a save
  // error unmounted the form and destroyed everything the user had typed.
  it('shows a save error as a dismissible banner and keeps the unsaved input', async () => {
    stubFetch(
      { ok: true, json: async () => ({ data: createDefaultDataStore(), modifiedTime: 'v1' }) },
      { ok: false, status: 500, json: async () => ({}) }
    );
    render(<DataPageShell>{(ctx) => <Child {...ctx} />}</DataPageShell>);
    await screen.findByLabelText('Champ');

    await userEvent.type(screen.getByLabelText('Champ'), 'ma saisie');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur lors de la sauvegarde.');
    // The form is still mounted with the user's input intact.
    expect(screen.getByLabelText('Champ')).toHaveValue('ma saisie');

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Champ')).toHaveValue('ma saisie');
  });

  // Regression: only the dashboard rendered the ConflictModal, so on every
  // other page a 409 was silently swallowed.
  it('renders the conflict modal on any page when a save 409s', async () => {
    stubFetch(
      { ok: true, json: async () => ({ data: createDefaultDataStore(), modifiedTime: 'v1' }) },
      { ok: false, status: 409, json: async () => ({ error: 'conflict', currentModifiedTime: 'v2' }) }
    );
    render(<DataPageShell>{(ctx) => <Child {...ctx} />}</DataPageShell>);
    await screen.findByLabelText('Champ');

    await userEvent.type(screen.getByLabelText('Champ'), 'edit');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Conflit de sauvegarde')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Forcer l'écrasement" })).toBeInTheDocument();
    expect(screen.getByLabelText('Champ')).toHaveValue('edit');
  });

  it('forces the overwrite with the rejected payload, not the pre-edit data', async () => {
    const fetchMock = stubFetch(
      { ok: true, json: async () => ({ data: createDefaultDataStore(), modifiedTime: 'v1' }) },
      { ok: false, status: 409, json: async () => ({ error: 'conflict', currentModifiedTime: 'v2' }) },
      { ok: true, json: async () => ({ ok: true, modifiedTime: 'v3' }) }
    );
    render(<DataPageShell>{(ctx) => <Child {...ctx} />}</DataPageShell>);
    await screen.findByLabelText('Champ');

    await userEvent.type(screen.getByLabelText('Champ'), 'mon edit');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await screen.findByText('Conflit de sauvegarde');
    await userEvent.click(screen.getByRole('button', { name: "Forcer l'écrasement" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const forced = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(forced.force).toBe(true);
    expect(forced.data.emailTemplates).toEqual([{ titre: 'mon edit', corps: '' }]);
  });

  it('shows a failed reload as a banner without discarding the data already on screen', async () => {
    stubFetch(
      { ok: true, json: async () => ({ data: createDefaultDataStore(), modifiedTime: 'v1' }) },
      { ok: false, status: 409, json: async () => ({ error: 'conflict', currentModifiedTime: 'v2' }) },
      { ok: false, json: async () => ({}) }
    );
    render(<DataPageShell>{(ctx) => <Child {...ctx} />}</DataPageShell>);
    await screen.findByLabelText('Champ');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await screen.findByText('Conflit de sauvegarde');

    await userEvent.click(screen.getByRole('button', { name: 'Recharger la dernière version' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les données.');
    expect(screen.getByLabelText('Champ')).toBeInTheDocument();
  });

  it('confirms a successful save', async () => {
    stubFetch(
      { ok: true, json: async () => ({ data: createDefaultDataStore(), modifiedTime: 'v1' }) },
      { ok: true, json: async () => ({ ok: true, modifiedTime: 'v2' }) }
    );
    render(<DataPageShell>{(ctx) => <Child {...ctx} />}</DataPageShell>);
    await screen.findByLabelText('Champ');

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Modifications enregistrées.');
  });
});
