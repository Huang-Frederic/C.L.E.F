import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loadData, saveData, SaveConflictError } from './dataStore';
import * as driveClient from './driveClient';
import { createDefaultDataStore } from './defaultData';

vi.mock('./driveClient');

beforeEach(() => {
  vi.resetAllMocks();
});

describe('loadData', () => {
  it('parses the JSON content and returns the modifiedTime', async () => {
    const stored = { ...createDefaultDataStore(), biens: [] };
    vi.mocked(driveClient.getFileContent).mockResolvedValue(JSON.stringify(stored));
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:00:00.000Z');

    const result = await loadData('file-123');

    expect(result.data).toEqual(stored);
    expect(result.modifiedTime).toBe('2026-09-29T10:00:00.000Z');
  });

  it('returns the default data store when the file is empty', async () => {
    vi.mocked(driveClient.getFileContent).mockResolvedValue('');
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:00:00.000Z');

    const result = await loadData('file-123');

    expect(result.data).toEqual(createDefaultDataStore());
  });

  // Regression: `taxeFonciere` was added to `MontageFinancier` after real data
  // had already been saved to Drive without it, so `montage.taxeFonciere` was
  // `undefined` and every calculation using it (totalMensualite, cashflow)
  // silently became NaN. Loaded data must be backfilled at this boundary so
  // every other consumer can keep assuming a complete `MontageFinancier`.
  it('backfills montageFinancier.taxeFonciere to 0 for data saved before that field existed', async () => {
    const stored = createDefaultDataStore();
    // Simulate a pre-existing Drive file: no `taxeFonciere` key at all.
    const { taxeFonciere: _omit, ...montageWithoutTaxeFonciere } = stored.montageFinancier;
    const storedJson = { ...stored, montageFinancier: montageWithoutTaxeFonciere };
    vi.mocked(driveClient.getFileContent).mockResolvedValue(JSON.stringify(storedJson));
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:00:00.000Z');

    const result = await loadData('file-123');

    expect(result.data.montageFinancier.taxeFonciere).toBe(0);
  });
});

describe('saveData', () => {
  it('writes the new content when the expected modifiedTime matches the current one', async () => {
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:00:00.000Z');
    vi.mocked(driveClient.updateFileContent).mockResolvedValue('2026-09-29T10:05:00.000Z');

    const data = createDefaultDataStore();
    const newModifiedTime = await saveData('file-123', data, '2026-09-29T10:00:00.000Z');

    expect(newModifiedTime).toBe('2026-09-29T10:05:00.000Z');
    expect(driveClient.updateFileContent).toHaveBeenCalledWith('file-123', JSON.stringify(data, null, 2));
  });

  it('throws SaveConflictError when someone else saved in the meantime, without writing', async () => {
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:10:00.000Z');

    const data = createDefaultDataStore();
    await expect(saveData('file-123', data, '2026-09-29T10:00:00.000Z')).rejects.toBeInstanceOf(
      SaveConflictError
    );
    expect(driveClient.updateFileContent).not.toHaveBeenCalled();
  });

  it('bypasses the conflict check when force is true', async () => {
    vi.mocked(driveClient.getFileModifiedTime).mockResolvedValue('2026-09-29T10:10:00.000Z');
    vi.mocked(driveClient.updateFileContent).mockResolvedValue('2026-09-29T10:15:00.000Z');

    const data = createDefaultDataStore();
    const newModifiedTime = await saveData('file-123', data, '2026-09-29T10:00:00.000Z', true);

    expect(newModifiedTime).toBe('2026-09-29T10:15:00.000Z');
    expect(driveClient.getFileModifiedTime).not.toHaveBeenCalled();
  });
});
