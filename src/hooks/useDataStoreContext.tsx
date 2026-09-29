'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useDataStore } from './useDataStore';

type DataStoreValue = ReturnType<typeof useDataStore>;

const DataStoreContext = createContext<DataStoreValue | null>(null);

/**
 * Mounted once in the root layout so the Drive blob is fetched once per
 * session instead of once per page: Next.js keeps the layout tree alive
 * across client-side navigation, so this provider (and the data it holds)
 * survives switching between pages.
 */
export function DataStoreProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const store = useDataStore(pathname !== '/login');
  return <DataStoreContext.Provider value={store}>{children}</DataStoreContext.Provider>;
}

export function useDataStoreContext(): DataStoreValue {
  const value = useContext(DataStoreContext);
  if (!value) {
    throw new Error('useDataStoreContext must be used within a DataStoreProvider');
  }
  return value;
}
