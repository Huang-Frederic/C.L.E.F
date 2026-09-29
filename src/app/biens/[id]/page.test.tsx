import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BienDetailPage from './page';
import { DataStoreProvider } from '@/hooks/useDataStoreContext';
import { createDefaultDataStore, createEmptyBien } from '@/lib/defaultData';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: 'b1' }),
  usePathname: () => '/biens/b1',
}));

function dataWithBien() {
  const data = createDefaultDataStore();
  data.biens = [createEmptyBien('b1', data.settings)];
  return data;
}

beforeEach(() => {
  vi.restoreAllMocks();
  push.mockClear();
});

describe('BienDetailPage', () => {
  // Regression: the page awaited save() and then pushed unconditionally, so a
  // 409 silently discarded the user's edit while pretending it was saved.
  it('stays on the form and shows the conflict modal when the save conflicts', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: dataWithBien(), modifiedTime: 'v1' }) })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({ error: 'conflict', currentModifiedTime: 'v2' }),
        })
    );

    render(
      <DataStoreProvider>
        <BienDetailPage />
      </DataStoreProvider>
    );
    const surface = await screen.findByLabelText('Surface sol (m2)');
    await userEvent.clear(surface);
    await userEvent.type(surface, '95');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Conflit de sauvegarde')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Surface sol (m2)')).toHaveValue(95);
  });

  it('navigates back to the list after a successful save', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: dataWithBien(), modifiedTime: 'v1' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, modifiedTime: 'v2' }) })
    );

    render(
      <DataStoreProvider>
        <BienDetailPage />
      </DataStoreProvider>
    );
    await screen.findByLabelText('Surface sol (m2)');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(push).toHaveBeenCalledWith('/');
  });
});
