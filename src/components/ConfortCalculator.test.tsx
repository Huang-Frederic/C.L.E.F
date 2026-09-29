import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfortCalculator } from './ConfortCalculator';
import type { BaremeConfortItem } from '@/lib/types';

const bareme: BaremeConfortItem[] = [
  { label: 'Eau courante', m2Bonus: 4 },
  { label: 'Gaz', m2Bonus: 2 },
];

describe('ConfortCalculator', () => {
  it('recomputes the surface confort live as quantities change', async () => {
    const onChange = vi.fn();
    render(<ConfortCalculator bareme={bareme} equipements={{}} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText('Eau courante'));
    await userEvent.type(screen.getByLabelText('Eau courante'), '2');

    expect(onChange).toHaveBeenLastCalledWith(8, { 'Eau courante': 2 });
  });
});
