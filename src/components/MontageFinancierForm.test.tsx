import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MontageFinancierForm } from './MontageFinancierForm';
import type { MontageFinancier } from '@/lib/types';

const montage: MontageFinancier = {
  prixAchat: 161000.21,
  prixTravaux: 0,
  tauxCredit: 2.9,
  dureeCreditAnnees: 25,
  loyerHypothese: 1200,
  pno: 20,
  assuranceEmprunteurMensuel: 20,
  chargesMensuelles: 170.0833333,
  enveloppeImprevus: 25,
  gestionGliPourcent: 7.5,
};

describe('MontageFinancierForm', () => {
  it('shows the computed cashflow for the given inputs', () => {
    render(<MontageFinancierForm montage={montage} onSave={vi.fn()} />);
    expect(screen.getByText((content) => content.includes('119.78 €'))).toBeInTheDocument();
  });

  // Regression: the fields were fully controlled by the parent's saved state,
  // so a real keystroke sequence was reverted before the next keystroke.
  it('keeps the typed value and only reports it on Enregistrer', async () => {
    const onSave = vi.fn();
    render(<MontageFinancierForm montage={montage} onSave={onSave} />);

    const input = screen.getByLabelText('Loyer hypothèse');
    await userEvent.clear(input);
    await userEvent.type(input, '1300');
    expect(input).toHaveValue(1300);
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledWith({ ...montage, loyerHypothese: 1300 });
  });

  it('resyncs when the montage prop changes externally (post-conflict reload)', async () => {
    const { rerender } = render(<MontageFinancierForm montage={montage} onSave={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText('PNO'));
    await userEvent.type(screen.getByLabelText('PNO'), '99');

    rerender(<MontageFinancierForm montage={{ ...montage, pno: 42 }} onSave={vi.fn()} />);

    expect(screen.getByLabelText('PNO')).toHaveValue(42);
  });
});
