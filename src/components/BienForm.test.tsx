import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BienForm } from './BienForm';
import type { Bien, ReferentielLoyer, BaremeConfortItem } from '@/lib/types';

const referentielLoyers: ReferentielLoyer[] = [{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }];
const baremeConfort: BaremeConfortItem[] = [{ label: 'Eau courante', m2Bonus: 4 }];

function makeBien(overrides: Partial<Bien> = {}): Bien {
  return {
    id: 'b1',
    lienAnnonce: '',
    lieu: '',
    typePiece: '',
    surfaceSol: 0,
    surfaceConfort: 0,
    equipements: {},
    prixAchat: 0,
    prixTravaux: 0,
    tauxCredit: 3,
    dureeCreditAnnees: 25,
    loyerM2Override: null,
    taxeFonciere: 0,
    chargesCopro: 0,
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

describe('BienForm', () => {
  it('submits the edited surfaceSol value', async () => {
    const onSubmit = vi.fn();
    render(
      <BienForm bien={makeBien()} referentielLoyers={referentielLoyers} baremeConfort={baremeConfort} onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    await userEvent.type(screen.getByLabelText('Surface sol (m2)'), '95');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ surfaceSol: 95 }));
  });

  it('updates surfaceConfort when an equipment quantity changes', async () => {
    const onSubmit = vi.fn();
    render(
      <BienForm bien={makeBien()} referentielLoyers={referentielLoyers} baremeConfort={baremeConfort} onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    await userEvent.clear(screen.getByLabelText('Eau courante'));
    await userEvent.type(screen.getByLabelText('Eau courante'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ surfaceConfort: 8 }));
  });

  // The spec requires surfaceConfort to be "éditable manuellement en override";
  // `equipements: null` is the documented marker for that override.
  it('lets the user override surfaceConfort manually, marking equipements as null', async () => {
    const onSubmit = vi.fn();
    render(
      <BienForm
        bien={makeBien({ surfaceConfort: 12, equipements: { 'Eau courante': 3 } })}
        referentielLoyers={referentielLoyers}
        baremeConfort={baremeConfort}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Surface confort (m2) — surcharge manuelle');
    expect(input).toHaveValue(12);

    await userEvent.clear(input);
    await userEvent.type(input, '42');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ surfaceConfort: 42, equipements: null })
    );
  });

  it('shows the stored surfaceConfort of an imported bien (equipements: null)', () => {
    render(
      <BienForm
        bien={makeBien({ surfaceConfort: 30, equipements: null })}
        referentielLoyers={referentielLoyers}
        baremeConfort={baremeConfort}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Surface confort (m2) — surcharge manuelle')).toHaveValue(30);
  });

  it('resets typePiece when the ville changes', async () => {
    const multiVilleReferentiel: ReferentielLoyer[] = [
      { ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 },
      { ville: 'Sannois', typePiece: 'T2', loyerM2: 14.2 },
    ];
    const onSubmit = vi.fn();
    render(
      <BienForm
        bien={makeBien({ lieu: 'Eaubonne', typePiece: '4P+' })}
        referentielLoyers={multiVilleReferentiel}
        baremeConfort={baremeConfort}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText('Ville'), 'Sannois');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ lieu: 'Sannois', typePiece: '' }));
  });
});
