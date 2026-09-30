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

// BienTable renders BOTH a mobile card list (`md:hidden`) and a desktop table
// (`hidden md:block`) so a phone gets a real card layout instead of a squeezed
// table. jsdom has no real CSS cascade in these component tests, so it never
// applies either `hidden` — both representations are simultaneously "visible"
// to Testing Library, and every assertion below expects two matches (one per
// representation) rather than one.
describe('BienTable', () => {
  it('renders the computed rentabilité nette for each bien', () => {
    render(
      <BienTable biens={[makeBien()]} referentielLoyers={referentielLoyers} settings={settings} onDelete={vi.fn()} onAdd={vi.fn()} />
    );
    expect(screen.getAllByText('6.65%')).toHaveLength(2);
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
    // 3 unknown metrics (breakeven, rentabilité, max enchères) x 2 representations.
    expect(screen.getAllByText('loyer inconnu')).toHaveLength(6);
  });

  it('calls onDelete with the bien id when the delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <BienTable biens={[makeBien()]} referentielLoyers={referentielLoyers} settings={settings} onDelete={onDelete} onAdd={vi.fn()} />
    );
    const [deleteButton] = screen.getAllByRole('button', { name: 'Supprimer' });
    await userEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith('b1');
  });

  it('calls onAdd when the add button is clicked', async () => {
    const onAdd = vi.fn();
    render(<BienTable biens={[]} referentielLoyers={referentielLoyers} settings={settings} onDelete={vi.fn()} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un bien' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('has a dedicated Modifier link to the bien detail page', () => {
    render(
      <BienTable biens={[makeBien()]} referentielLoyers={referentielLoyers} settings={settings} onDelete={vi.fn()} onAdd={vi.fn()} />
    );
    const links = screen.getAllByRole('link', { name: 'Modifier' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', '/biens/b1');
  });

  it('links straight to the listing URL, opening in a new tab', () => {
    render(
      <BienTable
        biens={[makeBien({ lienAnnonce: 'https://www.seloger.com/annonce/123' })]}
        referentielLoyers={referentielLoyers}
        settings={settings}
        onDelete={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    const links = screen.getAllByRole('link', { name: "Voir l'annonce" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', 'https://www.seloger.com/annonce/123');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  it('does not show a listing link when the bien has no lienAnnonce', () => {
    render(
      <BienTable
        biens={[makeBien({ lienAnnonce: '' })]}
        referentielLoyers={referentielLoyers}
        settings={settings}
        onDelete={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(screen.queryByRole('link', { name: "Voir l'annonce" })).not.toBeInTheDocument();
  });
});
