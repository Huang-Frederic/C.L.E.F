import { describe, expect, it, vi } from 'vitest';
import { getFileContent, getFileModifiedTime, updateFileContent } from './driveClient';

describe('getFileContent', () => {
  it('requests the file body as media', async () => {
    const fakeClient = { get: vi.fn().mockResolvedValue({ data: '{"foo":1}' }), update: vi.fn() };
    const content = await getFileContent('file-123', fakeClient as never);
    expect(content).toBe('{"foo":1}');
    expect(fakeClient.get).toHaveBeenCalledWith(
      { fileId: 'file-123', alt: 'media' },
      { responseType: 'text' }
    );
  });
});

describe('getFileModifiedTime', () => {
  it('requests the modifiedTime field', async () => {
    const fakeClient = {
      get: vi.fn().mockResolvedValue({ data: { modifiedTime: '2026-09-29T10:00:00.000Z' } }),
      update: vi.fn(),
    };
    const modifiedTime = await getFileModifiedTime('file-123', fakeClient as never);
    expect(modifiedTime).toBe('2026-09-29T10:00:00.000Z');
    expect(fakeClient.get).toHaveBeenCalledWith({ fileId: 'file-123', fields: 'modifiedTime' });
  });
});

describe('updateFileContent', () => {
  it('uploads the new content as JSON media and returns the new modifiedTime', async () => {
    const fakeClient = {
      get: vi.fn(),
      update: vi.fn().mockResolvedValue({ data: { modifiedTime: '2026-09-29T10:05:00.000Z' } }),
    };
    const modifiedTime = await updateFileContent('file-123', '{"foo":2}', fakeClient as never);
    expect(modifiedTime).toBe('2026-09-29T10:05:00.000Z');
    expect(fakeClient.update).toHaveBeenCalledWith({
      fileId: 'file-123',
      media: { mimeType: 'application/json', body: '{"foo":2}' },
      fields: 'modifiedTime',
    });
  });
});
