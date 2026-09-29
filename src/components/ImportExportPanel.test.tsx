import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExportPanel } from './ImportExportPanel';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ImportExportPanel', () => {
  it('shows the validation errors returned by the import endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'invalid', details: ['Feuille "Analyse" manquante.'] }),
      })
    );
    const onImportError = vi.fn();
    render(<ImportExportPanel onImportError={onImportError} />);

    const file = new File(['contenu'], 'Immo.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await userEvent.upload(screen.getByLabelText('Importer un Excel'), file);

    expect(onImportError).toHaveBeenCalledWith(['Feuille "Analyse" manquante.']);
  });
});
