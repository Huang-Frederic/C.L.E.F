import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BienTable } from './BienTable';
import type { Bien, ReferentielLoyer, Settings } from '@/lib/types';

const settings: Settings = { objectifRentabilitePourcent: 6, tauxCreditParDefaut: 3, dureeCreditParDefautAnnees: 25 };
const referentielLoyers: ReferentielLoyer[] = [{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }];

function makeBien(overrides: Partial<Bien> = {}): Bien {
  return {
    id: 'b1',
    lienAnnonce: '',
    lieu: 'Eaubonne',
    typePiece: '4P+',
    surfaceSol: 95,
    surfaceConfort: 30,
    equipements: null,
    prixAchat: 259000,
    prixTravaux: 5000,
    tauxCredit: 2,
    dureeCreditAnnees: 25,
    loyerM2Override: null,
    taxeFonciere: 1200,
    chargesCopro: 600,
    autresCharges: 0,
    classeEnergie: '',
    dateVisite: null,
    dateVente: null,
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
    ...overrides,
  };
}

describe('BienTable', () => {
  it('renders the computed rentabilité nette for each bien', () => {
    render(
      <BienTable biens={[makeBien()]} referentielLoyers={referentielLoyers} settings={settings} onDelete={vi.fn()} onAdd={vi.fn()} />
    );
    expect(screen.getByText('6.65%')).toBeInTheDocument();
  });

  it('shows a warning instead of a number when the référentiel has no match', () => {
    render(
      <BienTable
        biens={[makeBien({ lieu: 'Inconnue' })]}
        referentielLoyers={referentielLoyers}
        settings={settings}
        onDelete={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(screen.getAllByText('loyer inconnu')).toHaveLength(3);
  });

  it('calls onDelete with the bien id when the delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <BienTable biens={[makeBien()]} referentielLoyers={referentielLoyers} settings={settings} onDelete={onDelete} onAdd={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onDelete).toHaveBeenCalledWith('b1');
  });

  it('calls onAdd when the add button is clicked', async () => {
    const onAdd = vi.fn();
    render(<BienTable biens={[]} referentielLoyers={referentielLoyers} settings={settings} onDelete={vi.fn()} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un bien' }));
    expect(onAdd).toHaveBeenCalled();
  });
});
