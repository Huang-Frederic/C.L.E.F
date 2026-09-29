import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictModal } from './ConflictModal';

describe('ConflictModal', () => {
  it('calls onReload when the reload button is clicked', async () => {
    const onReload = vi.fn();
    render(<ConflictModal onReload={onReload} onForce={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Recharger la dernière version' }));
    expect(onReload).toHaveBeenCalled();
  });

  it('calls onForce when the force button is clicked', async () => {
    const onForce = vi.fn();
    render(<ConflictModal onReload={vi.fn()} onForce={onForce} />);
    await userEvent.click(screen.getByRole('button', { name: "Forcer l'écrasement" }));
    expect(onForce).toHaveBeenCalled();
  });
});
