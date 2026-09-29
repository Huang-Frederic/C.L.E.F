import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import * as dataStore from '@/lib/dataStore';
import { SaveConflictError } from '@/lib/dataStore';
import { createDefaultDataStore } from '@/lib/defaultData';

vi.mock('@/lib/dataStore', async () => {
  const actual = await vi.importActual<typeof dataStore>('@/lib/dataStore');
  return {
    ...actual,
    loadData: vi.fn(),
    saveData: vi.fn(),
  };
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_DRIVE_FILE_ID', 'file-123');
});

describe('GET /api/data', () => {
  it('returns the loaded data and modifiedTime', async () => {
    const data = createDefaultDataStore();
    vi.mocked(dataStore.loadData).mockResolvedValue({ data, modifiedTime: '2026-09-29T10:00:00.000Z' });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data, modifiedTime: '2026-09-29T10:00:00.000Z' });
  });
});

describe('PUT /api/data', () => {
  it('saves the data and returns the new modifiedTime', async () => {
    vi.mocked(dataStore.saveData).mockResolvedValue('2026-09-29T10:05:00.000Z');
    const data = createDefaultDataStore();
    const request = new Request('http://localhost/api/data', {
      method: 'PUT',
      body: JSON.stringify({ data, expectedModifiedTime: '2026-09-29T10:00:00.000Z' }),
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, modifiedTime: '2026-09-29T10:05:00.000Z' });
    expect(dataStore.saveData).toHaveBeenCalledWith('file-123', data, '2026-09-29T10:00:00.000Z', false);
  });

  it('returns 409 with the current modifiedTime on conflict', async () => {
    vi.mocked(dataStore.saveData).mockRejectedValue(new SaveConflictError('2026-09-29T10:10:00.000Z'));
    const data = createDefaultDataStore();
    const request = new Request('http://localhost/api/data', {
      method: 'PUT',
      body: JSON.stringify({ data, expectedModifiedTime: '2026-09-29T10:00:00.000Z' }),
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'conflict', currentModifiedTime: '2026-09-29T10:10:00.000Z' });
  });

  it('forwards the force flag', async () => {
    vi.mocked(dataStore.saveData).mockResolvedValue('2026-09-29T10:05:00.000Z');
    const data = createDefaultDataStore();
    const request = new Request('http://localhost/api/data', {
      method: 'PUT',
      body: JSON.stringify({ data, expectedModifiedTime: '2026-09-29T10:00:00.000Z', force: true }),
    });

    await PUT(request);

    expect(dataStore.saveData).toHaveBeenCalledWith('file-123', data, '2026-09-29T10:00:00.000Z', true);
  });
});
