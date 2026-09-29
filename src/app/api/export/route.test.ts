import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as dataStore from '@/lib/dataStore';
import * as excelExport from '@/lib/excelExport';
import { createDefaultDataStore } from '@/lib/defaultData';

vi.mock('@/lib/dataStore');
vi.mock('@/lib/excelExport');

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_DRIVE_FILE_ID', 'file-123');
});

describe('GET /api/export', () => {
  it('streams the generated workbook as an xlsx attachment', async () => {
    vi.mocked(dataStore.loadData).mockResolvedValue({
      data: createDefaultDataStore(),
      modifiedTime: '2026-09-29T10:00:00.000Z',
    });
    vi.mocked(excelExport.buildWorkbookBuffer).mockResolvedValue(Buffer.from('fake-xlsx'));

    const response = await GET();
    const body = await response.arrayBuffer();

    expect(response.headers.get('content-type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(response.headers.get('content-disposition')).toContain('Immo.xlsx');
    expect(Buffer.from(body).toString()).toBe('fake-xlsx');
  });
});
