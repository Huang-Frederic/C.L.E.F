import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDataStore } from './useDataStore';
import { createDefaultDataStore } from '@/lib/defaultData';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useDataStore', () => {
  it('loads the data on mount', async () => {
    const data = createDefaultDataStore();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data, modifiedTime: '2026-09-29T10:00:00.000Z' }),
      })
    );

    const { result } = renderHook(() => useDataStore());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(data);
    expect(result.current.error).toBeNull();
  });

  it('updates data and modifiedTime after a successful save', async () => {
    const initial = createDefaultDataStore();
    const updated = { ...initial, emailTemplates: [{ titre: 'Test', corps: 'Corps' }] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: initial, modifiedTime: 'v1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, modifiedTime: 'v2' }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save(updated);
    });

    expect(result.current.data).toEqual(updated);
    expect(result.current.conflict).toBeNull();
  });

  it('exposes a conflict instead of overwriting data when the server returns 409', async () => {
    const initial = createDefaultDataStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: initial, modifiedTime: 'v1' }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'conflict', currentModifiedTime: 'v2' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDataStore());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({ ...initial, emailTemplates: [{ titre: 'X', corps: 'Y' }] });
    });

    expect(result.current.conflict).toEqual({ currentModifiedTime: 'v2' });
    expect(result.current.data).toEqual(initial);
  });
});
