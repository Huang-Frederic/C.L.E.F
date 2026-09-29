import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BaremeConfortTable } from './BaremeConfortTable';
import type { BaremeConfortItem } from '@/lib/types';

describe('BaremeConfortTable', () => {
  it('adds a new empty row', async () => {
    const onChange = vi.fn();
    render(<BaremeConfortTable rows={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    expect(onChange).toHaveBeenCalledWith([{ label: '', m2Bonus: 0 }]);
  });

  it('updates the bonus of an existing row', async () => {
    const rows: BaremeConfortItem[] = [{ label: 'Gaz', m2Bonus: 2 }];
    const onChange = vi.fn();
    render(<BaremeConfortTable rows={rows} onChange={onChange} />);

    const bonusInput = screen.getByDisplayValue('2') as HTMLInputElement;
    fireEvent.change(bonusInput, { target: { value: '3' } });

    expect(onChange).toHaveBeenLastCalledWith([{ label: 'Gaz', m2Bonus: 3 }]);
  });
});
