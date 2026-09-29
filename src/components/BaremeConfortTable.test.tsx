import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BaremeConfortTable } from './BaremeConfortTable';
import type { BaremeConfortItem } from '@/lib/types';

describe('BaremeConfortTable', () => {
  it('adds a new empty row locally, without saving', async () => {
    const onSave = vi.fn();
    render(<BaremeConfortTable rows={[]} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    expect(screen.getByLabelText('Équipement ligne 1')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  // Regression: fully-controlled inputs reverted every keystroke, so the label
  // column could not be typed into at all.
  it('keeps every typed character and submits them on Enregistrer', async () => {
    const onSave = vi.fn();
    render(<BaremeConfortTable rows={[{ label: '', m2Bonus: 0 }]} onSave={onSave} />);

    const label = screen.getByLabelText('Équipement ligne 1');
    await userEvent.type(label, 'Balcon');
    expect(label).toHaveValue('Balcon');
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledWith([{ label: 'Balcon', m2Bonus: 0 }]);
  });

  it('submits an updated bonus', async () => {
    const rows: BaremeConfortItem[] = [{ label: 'Gaz', m2Bonus: 2 }];
    const onSave = vi.fn();
    render(<BaremeConfortTable rows={rows} onSave={onSave} />);

    const bonus = screen.getByLabelText('m² bonus ligne 1');
    await userEvent.clear(bonus);
    await userEvent.type(bonus, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSave).toHaveBeenCalledWith([{ label: 'Gaz', m2Bonus: 3 }]);
  });

  it('resyncs when the rows prop changes externally (post-conflict reload)', async () => {
    const onSave = vi.fn();
    const { rerender } = render(<BaremeConfortTable rows={[{ label: 'Gaz', m2Bonus: 2 }]} onSave={onSave} />);
    await userEvent.type(screen.getByLabelText('Équipement ligne 1'), 'X');

    rerender(<BaremeConfortTable rows={[{ label: 'Douche', m2Bonus: 4 }]} onSave={onSave} />);

    expect(screen.getByLabelText('Équipement ligne 1')).toHaveValue('Douche');
  });
});
