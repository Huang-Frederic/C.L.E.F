// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';
import * as excelImport from '@/lib/excelImport';
import * as dataStore from '@/lib/dataStore';
import { createDefaultDataStore } from '@/lib/defaultData';

vi.mock('@/lib/excelImport');
vi.mock('@/lib/dataStore');

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_DRIVE_FILE_ID', 'file-123');
});

function buildRequestWithFile(): Request {
  const formData = new FormData();
  formData.set('file', new Blob(['fake-bytes']), 'Immo.xlsx');
  return new Request('http://localhost/api/import', { method: 'POST', body: formData });
}

describe('POST /api/import', () => {
  it('returns 400 with the validation errors when the workbook is invalid', async () => {
    vi.mocked(excelImport.parseWorkbookBuffer).mockResolvedValue({
      ok: false,
      errors: ['Feuille "Analyse" manquante.'],
    });

    const response = await POST(buildRequestWithFile());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid', details: ['Feuille "Analyse" manquante.'] });
    expect(dataStore.saveData).not.toHaveBeenCalled();
  });

  it('replaces the stored data and returns the new modifiedTime when the workbook is valid', async () => {
    const imported = createDefaultDataStore();
    vi.mocked(excelImport.parseWorkbookBuffer).mockResolvedValue({ ok: true, data: imported });
    vi.mocked(dataStore.loadData).mockResolvedValue({
      data: createDefaultDataStore(),
      modifiedTime: '2026-09-29T10:00:00.000Z',
    });
    vi.mocked(dataStore.saveData).mockResolvedValue('2026-09-29T10:05:00.000Z');

    const response = await POST(buildRequestWithFile());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, modifiedTime: '2026-09-29T10:05:00.000Z' });
    expect(dataStore.saveData).toHaveBeenCalledWith('file-123', imported, '2026-09-29T10:00:00.000Z', true);
  });

  it('returns 400 when no file is provided', async () => {
    const response = await POST(new Request('http://localhost/api/import', { method: 'POST', body: new FormData() }));
    expect(response.status).toBe(400);
  });
});
