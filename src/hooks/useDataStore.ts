'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataStore } from '@/lib/types';

export interface ConflictInfo {
  currentModifiedTime: string;
}

/**
 * Discriminated outcome of a save. Returning this (instead of `void`) makes it
 * impossible for a caller to treat a 409 conflict or a network error as a
 * success — e.g. the bien pages must not `router.push('/')` unless `ok === true`.
 */
export type SaveResult = { ok: true } | { ok: 'conflict' } | { ok: false; error: string };

const SAVE_ERROR_MESSAGE = 'Erreur lors de la sauvegarde.';
const NOT_LOADED_MESSAGE = 'Les données ne sont pas chargées : sauvegarde impossible.';

export function useDataStore(enabled = true) {
  const [data, setData] = useState<DataStore | null>(null);
  const [loading, setLoading] = useState(enabled);
  // Load errors and save errors are deliberately separate: a load error means
  // there is nothing to show at all, a save error must NOT unmount the form the
  // user is typing in (spec: "les modifications non sauvegardées restent en
  // mémoire côté client (pas de perte de saisie)").
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  // `modifiedTime` lives in a ref, not in state: two saves triggered before the
  // first response resolves would otherwise both close over the same stale
  // value and make the user conflict with themselves.
  const modifiedTimeRef = useRef<string | null>(null);
  // Monotonic request counter. A response only applies its state effects if it
  // is still the latest in-flight request, so an out-of-order response cannot
  // overwrite fresher state (e.g. wipe a newer conflict back to `null`).
  const requestSeqRef = useRef(0);
  // The payload rejected by a 409, replayed verbatim by `resolveConflictForce`
  // so that forcing writes the user's edit and not the pre-edit `data`.
  const pendingSaveRef = useRef<DataStore | null>(null);
  // Saves are serialised so a second save always sees the `modifiedTime`
  // returned by the previous one.
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const fetchData = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Impossible de charger les données.');
      const body = await res.json();
      if (seq !== requestSeqRef.current) return;
      modifiedTimeRef.current = body.modifiedTime;
      pendingSaveRef.current = null;
      setData(body.data);
      setSaveError(null);
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      setLoadError((e as Error).message || 'Impossible de charger les données.');
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) fetchData();
  }, [fetchData, enabled]);

  const runSave = useCallback(async (next: DataStore, force: boolean): Promise<SaveResult> => {
    const expectedModifiedTime = modifiedTimeRef.current;
    if (!expectedModifiedTime) {
      setSaveError(NOT_LOADED_MESSAGE);
      return { ok: false, error: NOT_LOADED_MESSAGE };
    }

    const seq = ++requestSeqRef.current;
    const isLatest = () => seq === requestSeqRef.current;

    let res: Response;
    try {
      res = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next, expectedModifiedTime, force }),
      });
    } catch (e) {
      // Network failure (offline, DNS, …): surface it as an error state instead
      // of an unhandled rejection that never lets the caller continue.
      const error = `${SAVE_ERROR_MESSAGE} ${(e as Error).message ?? ''}`.trim();
      if (isLatest()) {
        pendingSaveRef.current = next;
        setSaveError(error);
      }
      return { ok: false, error };
    }

    try {
      if (res.status === 409) {
        const body = await res.json();
        if (isLatest()) {
          pendingSaveRef.current = next;
          setSaveError(null);
          setConflict({ currentModifiedTime: body.currentModifiedTime });
        }
        return { ok: 'conflict' };
      }
      if (!res.ok) {
        if (isLatest()) {
          pendingSaveRef.current = next;
          setSaveError(SAVE_ERROR_MESSAGE);
        }
        return { ok: false, error: SAVE_ERROR_MESSAGE };
      }
      const body = await res.json();
      if (isLatest()) {
        modifiedTimeRef.current = body.modifiedTime;
        pendingSaveRef.current = null;
        setData(next);
        setSaveError(null);
        setConflict(null);
      }
      return { ok: true };
    } catch (e) {
      const error = `${SAVE_ERROR_MESSAGE} ${(e as Error).message ?? ''}`.trim();
      if (isLatest()) {
        pendingSaveRef.current = next;
        setSaveError(error);
      }
      return { ok: false, error };
    }
  }, []);

  const save = useCallback(
    (next: DataStore, force = false): Promise<SaveResult> => {
      const result = saveQueueRef.current.then(() => runSave(next, force));
      saveQueueRef.current = result.catch(() => undefined);
      return result;
    },
    [runSave]
  );

  const resolveConflictReload = useCallback(async () => {
    setConflict(null);
    await fetchData();
  }, [fetchData]);

  /**
   * Re-sends the payload that was rejected by the 409 — NOT the current `data`,
   * which is still the pre-edit value because a conflicting save never applies.
   */
  const resolveConflictForce = useCallback(async (): Promise<SaveResult> => {
    const pending = pendingSaveRef.current;
    if (!pending) {
      setConflict(null);
      return { ok: false, error: NOT_LOADED_MESSAGE };
    }
    setConflict(null);
    return save(pending, true);
  }, [save]);

  const dismissSaveError = useCallback(() => setSaveError(null), []);

  return {
    data,
    loading,
    loadError,
    saveError,
    conflict,
    save,
    reload: fetchData,
    resolveConflictReload,
    resolveConflictForce,
    dismissSaveError,
  };
}
