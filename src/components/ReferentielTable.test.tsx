import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferentielTable } from './ReferentielTable';
import type { ReferentielLoyer } from '@/lib/types';

describe('ReferentielTable', () => {
  it('adds a new empty ville group locally, without saving', async () => {
    const onSave = vi.fn();
    render(<ReferentielTable rows={[]} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une ville' }));
    expect(screen.getByLabelText('Ville groupe 1')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  // Regression: the inputs used to be fully controlled by the parent's saved
  // state, so a real keystroke sequence was reverted and nothing could be typed.
  it('keeps every typed character and submits them on Enregistrer', async () => {
    const onSave = vi.fn();
    render(<ReferentielTable rows={[{ ville: '', typePiece: '', loyerM2: 0 }]} onSave={onSave} />);

    const ville = screen.getByLabelText('Ville groupe 1');
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

  it('removes a single row and submits the remaining ones', async () => {
    const rows: ReferentielLoyer[] = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];
    const onSave = vi.fn();
    render(<ReferentielTable rows={rows} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer ligne 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledWith([]);
  });

  // The core new behaviour: a city groups every type that shares its `ville`,
  // and editing the group's name renames all of them together, not just one row.
  it('groups rows by ville and renaming the group renames every row in it', async () => {
    const rows: ReferentielLoyer[] = [
      { ville: 'Paris', typePiece: '2P', loyerM2: 29.3 },
      { ville: 'Paris', typePiece: '3P', loyerM2: 26.4 },
      { ville: 'Lyon', typePiece: '1P', loyerM2: 15 },
    ];
    const onSave = vi.fn();
    render(<ReferentielTable rows={rows} onSave={onSave} />);

    // Exactly two groups exist (Paris, Lyon), not three flat rows.
    expect(screen.getByLabelText('Ville groupe 1')).toHaveValue('Paris');
    expect(screen.getByLabelText('Ville groupe 2')).toHaveValue('Lyon');
    // Both Paris rows are visible under the same group.
    expect(screen.getByLabelText('Type ligne 1')).toHaveValue('2P');
    expect(screen.getByLabelText('Type ligne 2')).toHaveValue('3P');

    const villeGroup1 = screen.getByLabelText('Ville groupe 1');
    await userEvent.clear(villeGroup1);
    await userEvent.type(villeGroup1, 'Paris 15e');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSave).toHaveBeenCalledWith([
      { ville: 'Paris 15e', typePiece: '2P', loyerM2: 29.3 },
      { ville: 'Paris 15e', typePiece: '3P', loyerM2: 26.4 },
      { ville: 'Lyon', typePiece: '1P', loyerM2: 15 },
    ]);
  });

  it('adds a new type within an existing ville group, not a new group', async () => {
    const rows: ReferentielLoyer[] = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];
    const onSave = vi.fn();
    render(<ReferentielTable rows={rows} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un type' }));

    // Still one group...
    expect(screen.queryByLabelText('Ville groupe 2')).not.toBeInTheDocument();
    // ...but a second type row pre-filled with the same ville.
    await userEvent.type(screen.getByLabelText('Type ligne 2'), '3P');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSave).toHaveBeenCalledWith([
      { ville: 'Paris', typePiece: '2P', loyerM2: 29.3 },
      { ville: 'Paris', typePiece: '3P', loyerM2: 0 },
    ]);
  });

  it('resyncs when the rows prop changes externally (post-conflict reload)', async () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <ReferentielTable rows={[{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }]} onSave={onSave} />
    );
    await userEvent.type(screen.getByLabelText('Ville groupe 1'), 'X');

    rerender(<ReferentielTable rows={[{ ville: 'Lyon', typePiece: '3P', loyerM2: 15 }]} onSave={onSave} />);

    expect(screen.getByLabelText('Ville groupe 1')).toHaveValue('Lyon');
  });
});
