import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    render(<MontageFinancierForm montage={montage} onChange={vi.fn()} />);
    expect(screen.getByText((content) => content.includes('119.78 €'))).toBeInTheDocument();
  });

  it('calls onChange with the updated montage when an input changes', () => {
    const onChange = vi.fn();
    render(<MontageFinancierForm montage={montage} onChange={onChange} />);

    const input = screen.getByLabelText('Loyer hypothèse') as HTMLInputElement;
    // Use fireEvent to change the value
    fireEvent.change(input, { target: { value: '1300' } });

    expect(onChange).toHaveBeenLastCalledWith({ ...montage, loyerHypothese: 1300 });
  });
});
