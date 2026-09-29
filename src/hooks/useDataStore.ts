'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DataStore } from '@/lib/types';

interface ConflictInfo {
  currentModifiedTime: string;
}

export function useDataStore() {
  const [data, setData] = useState<DataStore | null>(null);
  const [modifiedTime, setModifiedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Impossible de charger les données.');
      const body = await res.json();
      setData(body.data);
      setModifiedTime(body.modifiedTime);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const save = useCallback(
    async (next: DataStore, force = false) => {
      if (!modifiedTime) return;
      const res = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next, expectedModifiedTime: modifiedTime, force }),
      });
      if (res.status === 409) {
        const body = await res.json();
        setConflict({ currentModifiedTime: body.currentModifiedTime });
        return;
      }
      if (!res.ok) {
        setError('Erreur lors de la sauvegarde.');
        return;
      }
      const body = await res.json();
      setData(next);
      setModifiedTime(body.modifiedTime);
      setConflict(null);
    },
    [modifiedTime]
  );

  const resolveConflictReload = useCallback(async () => {
    setConflict(null);
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, conflict, save, resolveConflictReload };
}
