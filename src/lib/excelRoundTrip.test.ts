import { describe, expect, it } from 'vitest';
import { buildWorkbookBuffer } from './excelExport';
import { parseWorkbookBuffer } from './excelImport';
import type { Bien, DataStore } from './types';

function makeBien(overrides: Partial<Bien> = {}): Bien {
  return {
    id: 'b1',
    lienAnnonce: 'https://example.com/annonce',
    lieu: 'Eaubonne',
    typePiece: '4P+',
    surfaceSol: 95,
    surfaceConfort: 30,
    equipements: { 'Eau courante': 1, Douche: 2 },
    prixAchat: 259000,
    prixTravaux: 5000,
    tauxCredit: 2.1,
    dureeCreditAnnees: 18,
    loyerM2Override: 13.5,
    taxeFonciere: 1200,
    chargesCopro: 600,
    autresCharges: 120,
    classeEnergie: 'D',
    dateVisite: '2026-05-04',
    dateVente: '2026-06-30',
    commentaireAntho: 'À revoir',
    commentaireGilly: 'OK',
    commentaireDecision: 'On y va',
    ...overrides,
  };
}

function makeFullDataStore(): DataStore {
  return {
    biens: [
      makeBien(),
      // A bien whose surfaceConfort is a manual override (equipements: null)
      // and which has no dates nor loyer override.
      makeBien({
        id: 'b2',
        lieu: 'Sannois',
        typePiece: 'T2',
        equipements: null,
        loyerM2Override: null,
        dateVisite: null,
        dateVente: null,
        commentaireAntho: '',
        commentaireGilly: '',
        commentaireDecision: '',
      }),
    ],
    referentielLoyers: [
      { ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 },
      { ville: 'Sannois', typePiece: 'T2', loyerM2: 14.2 },
    ],
    baremeConfort: [
      { label: 'Eau courante', m2Bonus: 4 },
      { label: 'Douche', m2Bonus: 4 },
    ],
    montageFinancier: {
      prixAchat: 161000.21,
      prixTravaux: 1500,
      tauxCredit: 2.9,
      dureeCreditAnnees: 22,
      loyerHypothese: 1200,
      pno: 20,
      assuranceEmprunteurMensuel: 21,
      chargesMensuelles: 170.5,
      taxeFonciere: 950,
      enveloppeImprevus: 25,
      gestionGliPourcent: 7.5,
    },
    emailTemplates: [
      { titre: 'Contact avocat', corps: 'Bonjour Maître,' },
      { titre: 'Relance agence', corps: 'Bonjour,\nSuite à notre visite…' },
    ],
    settings: {
      objectifRentabilitePourcent: 7.5,
      tauxCreditParDefaut: 4.2,
      dureeCreditParDefautAnnees: 20,
    },
  };
}

describe('Excel export/import round-trip', () => {
  it('preserves every stored field (ids excepted, they are regenerated)', async () => {
    const original = makeFullDataStore();

    const buffer = await buildWorkbookBuffer(original);
    const result = await parseWorkbookBuffer(buffer);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');

    const stripIds = (data: DataStore) => ({
      ...data,
      biens: data.biens.map(({ id: _id, ...rest }) => rest),
    });

    expect(stripIds(result.data)).toEqual(stripIds(original));
  });
});
