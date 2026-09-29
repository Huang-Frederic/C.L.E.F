import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExportPanel } from './ImportExportPanel';

function makeFile() {
  return new File(['contenu'], 'Immo.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ImportExportPanel', () => {
  it('shows the validation errors returned by the import endpoint', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'invalid', details: ['Feuille "Analyse" manquante.'] }),
      })
    );
    const onImportError = vi.fn();
    render(<ImportExportPanel onImportError={onImportError} />);

    await userEvent.upload(screen.getByLabelText('Importer un Excel'), makeFile());

    expect(onImportError).toHaveBeenCalledWith(['Feuille "Analyse" manquante.']);
  });

  // Import replaces the whole shared dataset irreversibly: it must be confirmed.
  it('does not upload anything when the confirmation is declined', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onImportSuccess = vi.fn();
    render(<ImportExportPanel onImportError={vi.fn()} onImportSuccess={onImportSuccess} />);

    await userEvent.upload(screen.getByLabelText('Importer un Excel'), makeFile());

    expect(confirmSpy).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onImportSuccess).not.toHaveBeenCalled();
  });

  it('uploads the file once the confirmation is accepted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const onImportSuccess = vi.fn();
    render(<ImportExportPanel onImportError={vi.fn()} onImportSuccess={onImportSuccess} />);

    await userEvent.upload(screen.getByLabelText('Importer un Excel'), makeFile());

    expect(fetchMock).toHaveBeenCalledWith('/api/import', expect.objectContaining({ method: 'POST' }));
    expect(onImportSuccess).toHaveBeenCalled();
  });
});
