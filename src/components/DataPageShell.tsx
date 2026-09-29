'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { useDataStore, type SaveResult } from '@/hooks/useDataStore';
import { ConflictModal } from './ConflictModal';
import type { DataStore } from '@/lib/types';

export interface DataPageContext {
  data: DataStore;
  save: (next: DataStore) => Promise<SaveResult>;
}

interface DataPageShellProps {
  children: (ctx: DataPageContext) => ReactNode;
}

/**
 * Shared shell for every authenticated page that reads/writes the Drive blob.
 *
 * It centralises the three things every page must do and which were previously
 * only done (partially) by the dashboard:
 *  - show a full-page message while loading, and for a genuine LOAD failure;
 *  - show a save failure as a dismissible banner ABOVE the page content, so the
 *    user's unsaved input is never unmounted;
 *  - render the ConflictModal whenever a save 409s, wired to the hook's own
 *    reload / force-overwrite resolutions.
 */
export function DataPageShell({ children }: DataPageShellProps) {
  const {
    data,
    loading,
    loadError,
    saveError,
    conflict,
    save,
    resolveConflictReload,
    resolveConflictForce,
    dismissSaveError,
  } = useDataStore();
  const [saved, setSaved] = useState(false);

  // Every page's save goes through here, so the outcome of `save()` is always
  // handled: success shows a confirmation, a conflict shows the modal (via the
  // hook's `conflict` state) and an error shows the banner below.
  const handleSave = useCallback(
    async (next: DataStore): Promise<SaveResult> => {
      setSaved(false);
      const result = await save(next);
      setSaved(result.ok === true);
      return result;
    },
    [save]
  );

  if (loading) return <main className="p-8">Chargement…</main>;
  // Only a genuine initial-load failure (nothing to show) replaces the page.
  if (loadError && !data) return <main className="p-8 text-red-600">{loadError}</main>;
  if (!data) return null;

  return (
    <main>
      {/* A save error — or a reload that failed while data is already on
          screen — is a banner, never a replacement of the page content. */}
      {(saveError || loadError) && (
        <div
          role="alert"
          className="m-8 mb-0 flex items-start justify-between gap-4 rounded border border-red-400 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{saveError ?? loadError}</p>
          {saveError && (
            <button type="button" onClick={dismissSaveError} className="rounded border px-2 py-1">
              Fermer
            </button>
          )}
        </div>
      )}
      {saved && !saveError && !conflict && (
        <p role="status" className="m-8 mb-0 rounded border border-green-400 bg-green-50 p-4 text-sm text-green-800">
          Modifications enregistrées.
        </p>
      )}
      {children({ data, save: handleSave })}
      {conflict && <ConflictModal onReload={resolveConflictReload} onForce={resolveConflictForce} />}
    </main>
  );
}
