import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DataStoreProvider, useDataStoreContext } from './useDataStoreContext';
import { createDefaultDataStore } from '@/lib/defaultData';

const pathname = vi.hoisted(() => ({ current: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  vi.restoreAllMocks();
  pathname.current = '/';
});

function Consumer() {
  const { data, loading } = useDataStoreContext();
  if (loading) return <p>Chargement…</p>;
  return <p>{data ? 'Données chargées' : 'Pas de données'}</p>;
}

describe('DataStoreProvider / useDataStoreContext', () => {
  it('fetches once and provides the data to a consumer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: createDefaultDataStore(), modifiedTime: 'v1' }) });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <DataStoreProvider>
        <Consumer />
      </DataStoreProvider>
    );

    await waitFor(() => expect(screen.getByText('Données chargées')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // The provider wraps every route including /login (mounted once in the root
  // layout), but /login has no session yet — fetching there would just bounce
  // off the middleware redirect and fail to parse as JSON.
  it('does not fetch while on /login', () => {
    pathname.current = '/login';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <DataStoreProvider>
        <Consumer />
      </DataStoreProvider>
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws a clear error when used outside a DataStoreProvider', () => {
    // Suppress React's expected error-boundary console noise for this case.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow('useDataStoreContext must be used within a DataStoreProvider');
  });
});
