import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDataStore } from './useDataStore';
import { createDefaultDataStore } from '@/lib/defaultData';

beforeEach(() => {
  vi.restoreAllMocks();
});

function loadResponse(data: unknown, modifiedTime: string) {
  return { ok: true, json: async () => ({ data, modifiedTime }) };
}

function okSaveResponse(modifiedTime: string) {
  return { ok: true, json: async () => ({ ok: true, modifiedTime }) };
}

function conflictResponse(currentModifiedTime: string) {
  return {
    ok: false,
    status: 409,
    json: async () => ({ error: 'conflict', currentModifiedTime }),
  };
}

describe('useDataStore', () => {
  it('loads the data on mount', async () => {
    const data = createDefaultDataStore();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(loadResponse(data, '2026-09-29T10:00:00.000Z')));

    const { result } = renderHook(() => useDataStore());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(data);
    expect(result.current.loadError).toBeNull();
    expect(result.current.saveError).toBeNull();
  });

  it('updates data after a successful save and returns ok', async () => {
    const initial = createDefaultDataStore();
    const updated = { ...initial, emailTemplates: [{ titre: 'Test', corps: 'Corps' }] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loadResponse(initial, 'v1'))
      .mockResolvedValueOnce(okSaveResponse('v2'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.save(updated);
    });

    expect(outcome).toEqual({ ok: true });
    expect(result.current.data).toEqual(updated);
    expect(result.current.conflict).toBeNull();
  });

  it('exposes a conflict instead of overwriting data when the server returns 409', async () => {
    const initial = createDefaultDataStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loadResponse(initial, 'v1'))
      .mockResolvedValueOnce(conflictResponse('v2'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.save({ ...initial, emailTemplates: [{ titre: 'X', corps: 'Y' }] });
    });

    expect(outcome).toEqual({ ok: 'conflict' });
    expect(result.current.conflict).toEqual({ currentModifiedTime: 'v2' });
    expect(result.current.data).toEqual(initial);
  });

  // Regression: forcing used to re-send the component's `data`, which is still
  // the PRE-edit value because a conflicting save never applies.
  it('resolveConflictForce re-sends the payload rejected by the 409, not the stale data', async () => {
    const initial = createDefaultDataStore();
    const edited = { ...initial, emailTemplates: [{ titre: 'Mon edit', corps: 'Corps' }] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loadResponse(initial, 'v1'))
      .mockResolvedValueOnce(conflictResponse('v2'))
      .mockResolvedValueOnce(okSaveResponse('v3'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.save(edited);
    });

    await act(async () => {
      await result.current.resolveConflictForce();
    });

    const forcedBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(forcedBody.force).toBe(true);
    expect(forcedBody.data).toEqual(edited);
    expect(result.current.data).toEqual(edited);
    expect(result.current.conflict).toBeNull();
  });

  // Regression: two saves fired back-to-back both sent the same stale
  // expectedModifiedTime, so the user 409'd against their own previous save.
  it('uses the modifiedTime returned by the previous save for the next one', async () => {
    const initial = createDefaultDataStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loadResponse(initial, 'v1'))
      .mockResolvedValueOnce(okSaveResponse('v2'))
      .mockResolvedValueOnce(okSaveResponse('v3'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      // Both saves are issued from the same closure, without re-rendering in
      // between — exactly the situation that produced self-conflicts.
      await Promise.all([
        result.current.save({ ...initial, emailTemplates: [{ titre: 'A', corps: '' }] }),
        result.current.save({ ...initial, emailTemplates: [{ titre: 'B', corps: '' }] }),
      ]);
    });

    expect(JSON.parse(fetchMock.mock.calls[1][1].body).expectedModifiedTime).toBe('v1');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).expectedModifiedTime).toBe('v2');
    expect(result.current.conflict).toBeNull();
  });

  // Regression: a response used to apply its effects (including
  // `setConflict(null)` and `setData`) even when a newer request had already
  // resolved, so an out-of-order response could erase fresher state.
  it('ignores the effects of a save response that resolves after a newer reload', async () => {
    const initial = createDefaultDataStore();
    const reloaded = { ...initial, emailTemplates: [{ titre: 'depuis le serveur', corps: '' }] };
    let releaseSlowSave: (() => void) | undefined;
    const slowSave = new Promise<void>((resolve) => {
      releaseSlowSave = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loadResponse(initial, 'v1'))
      // The save is issued first but resolves last.
      .mockImplementationOnce(async () => {
        await slowSave;
        return okSaveResponse('v2');
      })
      .mockResolvedValueOnce(loadResponse(reloaded, 'v9'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const slow = result.current.save({ ...initial, emailTemplates: [{ titre: 'mon edit', corps: '' }] });
      await new Promise((r) => setTimeout(r, 0));
      const reload = result.current.resolveConflictReload();
      await reload;
      releaseSlowSave!();
      await slow;
    });

    // The stale save response must not overwrite the freshly reloaded data.
    expect(result.current.data).toEqual(reloaded);
  });

  // Regression: the save fetch was unguarded, so a network failure produced an
  // unhandled rejection and the caller's `await save(...)` never resolved.
  it('turns a network failure into a save error instead of an unhandled rejection', async () => {
    const initial = createDefaultDataStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loadResponse(initial, 'v1'))
      .mockRejectedValueOnce(new Error('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { ok: boolean | string } | undefined;
    await act(async () => {
      outcome = await result.current.save({ ...initial, emailTemplates: [{ titre: 'X', corps: '' }] });
    });

    expect(outcome!.ok).toBe(false);
    expect(result.current.saveError).toContain('Erreur lors de la sauvegarde');
    // A save failure must never wipe the loaded data out from under the form.
    expect(result.current.data).toEqual(initial);
    expect(result.current.loadError).toBeNull();
  });

  it('reports a failed initial load as a load error, not a save error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

    const { result } = renderHook(() => useDataStore());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).toBe('Impossible de charger les données.');
    expect(result.current.saveError).toBeNull();
    expect(result.current.data).toBeNull();
  });

  // Regression: DataPageShell used to call this hook directly, so every page
  // navigation mounted a fresh instance and re-fetched from Drive from
  // scratch. The shared provider (useDataStoreContext) needs to skip the
  // fetch while on /login, where there's no session yet.
  it('does not fetch on mount when disabled', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore(false));

    expect(result.current.loading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dismisses a save error without touching the loaded data', async () => {
    const initial = createDefaultDataStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(loadResponse(initial, 'v1'))
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.save({ ...initial, emailTemplates: [{ titre: 'X', corps: '' }] });
    });
    expect(result.current.saveError).toBe('Erreur lors de la sauvegarde.');

    act(() => result.current.dismissSaveError());

    expect(result.current.saveError).toBeNull();
    expect(result.current.data).toEqual(initial);
  });
});
