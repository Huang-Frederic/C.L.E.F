import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NewBienPage from './page';
import { DataStoreProvider } from '@/hooks/useDataStoreContext';
import { createDefaultDataStore } from '@/lib/defaultData';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/biens/new' }));

beforeEach(() => {
  vi.restoreAllMocks();
  push.mockClear();
});

describe('NewBienPage', () => {
  // Regression: the new bien was built with hardcoded 3% / 25 years, so the
  // editable default-credit settings had no effect anywhere in the app.
  it('prefills the credit terms from the settings', async () => {
    const data = createDefaultDataStore();
    data.settings.tauxCreditParDefaut = 4.2;
    data.settings.dureeCreditParDefautAnnees = 20;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data, modifiedTime: 'v1' }) })
    );

    render(
      <DataStoreProvider>
        <NewBienPage />
      </DataStoreProvider>
    );

    expect(await screen.findByLabelText('Taux crédit (%)')).toHaveValue(4.2);
    expect(screen.getByLabelText('Durée crédit (années)')).toHaveValue(20);
  });
});
