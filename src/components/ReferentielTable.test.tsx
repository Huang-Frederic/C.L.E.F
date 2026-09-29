import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferentielTable } from './ReferentielTable';
import type { ReferentielLoyer } from '@/lib/types';

describe('ReferentielTable', () => {
  it('adds a new empty row locally, without saving', async () => {
    const onSave = vi.fn();
    render(<ReferentielTable rows={[]} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    expect(screen.getByLabelText('Ville ligne 1')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  // Regression: the inputs used to be fully controlled by the parent's saved
  // state, so a real keystroke sequence was reverted and nothing could be typed.
  it('keeps every typed character and submits them on Enregistrer', async () => {
    const onSave = vi.fn();
    render(<ReferentielTable rows={[{ ville: '', typePiece: '', loyerM2: 0 }]} onSave={onSave} />);

    const ville = screen.getByLabelText('Ville ligne 1');
    await userEvent.type(ville, 'Paris');
    expect(ville).toHaveValue('Paris');
    // Typing alone must never trigger a save (spec: explicit save only).
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledWith([{ ville: 'Paris', typePiece: '', loyerM2: 0 }]);
  });

  it('submits an updated loyer', async () => {
    const rows: ReferentielLoyer[] = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];
    const onSave = vi.fn();
    render(<ReferentielTable rows={rows} onSave={onSave} />);

    const loyer = screen.getByLabelText('Loyer m2 ligne 1');
    await userEvent.clear(loyer);
    await userEvent.type(loyer, '30');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSave).toHaveBeenCalledWith([{ ville: 'Paris', typePiece: '2P', loyerM2: 30 }]);
  });

  it('removes a row and submits the remaining ones', async () => {
    const rows: ReferentielLoyer[] = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];
    const onSave = vi.fn();
    render(<ReferentielTable rows={rows} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledWith([]);
  });

  it('resyncs when the rows prop changes externally (post-conflict reload)', async () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <ReferentielTable rows={[{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }]} onSave={onSave} />
    );
    await userEvent.type(screen.getByLabelText('Ville ligne 1'), 'X');

    rerender(<ReferentielTable rows={[{ ville: 'Lyon', typePiece: '3P', loyerM2: 15 }]} onSave={onSave} />);

    expect(screen.getByLabelText('Ville ligne 1')).toHaveValue('Lyon');
  });
});
