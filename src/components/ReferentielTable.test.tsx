import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferentielTable } from './ReferentielTable';
import type { ReferentielLoyer } from '@/lib/types';

describe('ReferentielTable', () => {
  it('adds a new empty row', async () => {
    const onChange = vi.fn();
    render(<ReferentielTable rows={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    expect(onChange).toHaveBeenCalledWith([{ ville: '', typePiece: '', loyerM2: 0 }]);
  });

  it('updates a field on an existing row', async () => {
    const rows: ReferentielLoyer[] = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];
    const onChange = vi.fn();
    render(<ReferentielTable rows={rows} onChange={onChange} />);

    const loyerInput = screen.getByDisplayValue('29.3') as HTMLInputElement;
    fireEvent.change(loyerInput, { target: { value: '30' } });

    expect(onChange).toHaveBeenLastCalledWith([{ ville: 'Paris', typePiece: '2P', loyerM2: 30 }]);
  });

  it('removes a row', async () => {
    const rows: ReferentielLoyer[] = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];
    const onChange = vi.fn();
    render(<ReferentielTable rows={rows} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
