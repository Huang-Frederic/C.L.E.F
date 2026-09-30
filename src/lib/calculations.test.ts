import { describe, expect, it } from 'vitest';
import {
  calculPmtMensuel,
  calculLoyerMoyenMensuel,
  calculMensualiteCredit,
  calculMensualiteBreakeven,
  calculRentabiliteNettePourcent,
  calculMaxEncheres,
  trouverLoyerM2,
  calculMontageFinancier,
} from './calculations';
import type { Bien, ReferentielLoyer, MontageFinancier } from './types';

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

const referentiel: ReferentielLoyer[] = [
  { ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 },
];

describe('calculPmtMensuel', () => {
  it('matches the original spreadsheet PMT formula', () => {
    expect(calculPmtMensuel(264000, 2, 25)).toBeCloseTo(1118.975454, 4);
  });

  it('returns capital / nombre de mensualités when the rate is 0', () => {
    expect(calculPmtMensuel(12000, 0, 10)).toBeCloseTo(100, 6);
  });
});

describe('trouverLoyerM2', () => {
  it('finds the matching entry by ville + typePiece', () => {
    expect(trouverLoyerM2(makeBien(), referentiel)).toBe(12.9);
  });

  it('returns null when there is no match and no override', () => {
    expect(trouverLoyerM2(makeBien({ lieu: 'Inconnue' }), referentiel)).toBeNull();
  });

  it('prefers loyerM2Override over the référentiel', () => {
    expect(trouverLoyerM2(makeBien({ loyerM2Override: 20 }), referentiel)).toBe(20);
  });
});

describe('calculLoyerMoyenMensuel', () => {
  it('matches the original spreadsheet formula', () => {
    expect(calculLoyerMoyenMensuel(makeBien(), referentiel)).toBeCloseTo(1612.5, 4);
  });

  it('returns 0 instead of NaN when there is no matching référentiel entry', () => {
    expect(calculLoyerMoyenMensuel(makeBien({ lieu: 'Inconnue' }), referentiel)).toBe(0);
  });
});

describe('calculMensualiteCredit', () => {
  it('matches the original spreadsheet formula', () => {
    expect(calculMensualiteCredit(makeBien())).toBeCloseTo(1118.975454, 4);
  });
});

describe('calculMensualiteBreakeven', () => {
  it('adds the credit instalment to the monthly share of fixed costs', () => {
    const bien = makeBien({ taxeFonciere: 1200, chargesCopro: 600, autresCharges: 0 });
    expect(calculMensualiteBreakeven(bien, referentiel)).toBeCloseTo(1268.975454, 4);
  });
});

describe('calculRentabiliteNettePourcent', () => {
  it('matches the expected net yield formula', () => {
    const bien = makeBien({ taxeFonciere: 1200, chargesCopro: 600, autresCharges: 0 });
    // (1612.5 - 150) / 264000 * 1200
    expect(calculRentabiliteNettePourcent(bien, referentiel)).toBeCloseTo(6.647727, 4);
  });

  it('returns 0 instead of Infinity/NaN when prixAchat + prixTravaux is 0', () => {
    const bien = makeBien({ prixAchat: 0, prixTravaux: 0 });
    expect(calculRentabiliteNettePourcent(bien, referentiel)).toBe(0);
  });
});

describe('calculMaxEncheres', () => {
  it('matches the expected max-bid formula', () => {
    const bien = makeBien({ taxeFonciere: 1200, chargesCopro: 600, autresCharges: 0 });
    // (1612.5 - 150) * 12 / 0.06
    expect(calculMaxEncheres(bien, referentiel, 6)).toBeCloseTo(292500, 2);
  });

  it('returns 0 instead of dividing by zero when the target yield is 0%', () => {
    const bien = makeBien();
    expect(calculMaxEncheres(bien, referentiel, 0)).toBe(0);
  });
});

// Regression coverage tying every derived metric to the three real rows of the
// user's own Immo.xlsx ("Analyse" sheet, rows 2-4), independently recomputed
// from the sheet's formulas rather than trusting its cached results (which can
// go stale). Also documents a real finding from that audit: the sheet's own
// "taxe foncière /an" column is `=(surfaceSol+surfaceConfort)*loyerM2` for
// every row — an accidental duplicate of the "Loyer moyen" formula, not real
// tax figures — so it was correctly left out of the imported data (taxeFonciere
// is 0 for these three biens) rather than importing that bogus value.
describe('derived metrics cross-checked against Immo.xlsx (Analyse rows 2-4)', () => {
  it('Eaubonne (row 2): 95m² + 30m² confort, 12.9€/m², 264 000€ financé, 7780€/an de charges copro', () => {
    const bien = makeBien({
      surfaceSol: 95,
      surfaceConfort: 30,
      prixAchat: 259000,
      prixTravaux: 5000,
      tauxCredit: 2,
      taxeFonciere: 0,
      chargesCopro: 7780,
      autresCharges: 0,
    });
    const ref: ReferentielLoyer[] = [{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }];
    expect(calculLoyerMoyenMensuel(bien, ref)).toBeCloseTo(1612.5, 4);
    expect(calculMensualiteBreakeven(bien, ref)).toBeCloseTo(1767.308787, 4);
    expect(calculRentabiliteNettePourcent(bien, ref)).toBeCloseTo(4.382576, 4);
    expect(calculMaxEncheres(bien, ref, 6)).toBeCloseTo(192833.33, 1);
  });

  it("Isles Adam (row 3): 83.48m² + 30.24m² confort, 18€/m², 250 000€ financé, 900€/an de charges copro", () => {
    const bien = makeBien({
      lieu: 'Isles Adam',
      typePiece: '4P+',
      surfaceSol: 83.48,
      surfaceConfort: 30.24,
      prixAchat: 250000,
      prixTravaux: 0,
      tauxCredit: 2,
      taxeFonciere: 0,
      chargesCopro: 900,
      autresCharges: 0,
    });
    const ref: ReferentielLoyer[] = [{ ville: 'Isles Adam', typePiece: '4P+', loyerM2: 18 }];
    expect(calculLoyerMoyenMensuel(bien, ref)).toBeCloseTo(2046.96, 4);
    expect(calculMensualiteBreakeven(bien, ref)).toBeCloseTo(1134.635847, 4);
    expect(calculRentabiliteNettePourcent(bien, ref)).toBeCloseTo(9.465408, 4);
    expect(calculMaxEncheres(bien, ref, 6)).toBeCloseTo(394392, 1);
  });

  it('St Denis (row 4): 64.7m², pas de surface confort, 17.8€/m², 50 000€ financé, aucune charge connue', () => {
    const bien = makeBien({
      lieu: 'St Denis',
      typePiece: '2P',
      surfaceSol: 64.7,
      surfaceConfort: 0,
      prixAchat: 50000,
      prixTravaux: 0,
      tauxCredit: 2,
      taxeFonciere: 0,
      chargesCopro: 0,
      autresCharges: 0,
    });
    const ref: ReferentielLoyer[] = [{ ville: 'St Denis', typePiece: '2P', loyerM2: 17.8 }];
    expect(calculLoyerMoyenMensuel(bien, ref)).toBeCloseTo(1151.66, 4);
    expect(calculMensualiteBreakeven(bien, ref)).toBeCloseTo(211.927169, 4);
    expect(calculRentabiliteNettePourcent(bien, ref)).toBeCloseTo(27.63984, 3);
    expect(calculMaxEncheres(bien, ref, 6)).toBeCloseTo(230332, 1);
  });
});

describe('calculMontageFinancier', () => {
  it('matches the original spreadsheet scenario', () => {
    const montage: MontageFinancier = {
      prixAchat: 161000.21,
      prixTravaux: 0,
      tauxCredit: 2.9,
      dureeCreditAnnees: 25,
      loyerHypothese: 1200,
      pno: 20,
      assuranceEmprunteurMensuel: 20,
      chargesMensuelles: 170.0833333,
      taxeFonciere: 0,
      enveloppeImprevus: 25,
      gestionGliPourcent: 7.5,
    };
    const resultat = calculMontageFinancier(montage);
    expect(resultat.mensualiteBanque).toBeCloseTo(755.1336298, 4);
    expect(resultat.gestionGli).toBeCloseTo(90, 4);
    expect(resultat.totalMensualite).toBeCloseTo(1080.216963, 3);
    expect(resultat.cashflow).toBeCloseTo(119.7830369, 3);
    expect(resultat.rendementBrutPourcent).toBeCloseTo(8.944, 3);
    expect(resultat.rendementNetPourcent).toBeCloseTo(7.676388, 3);
  });

  it('folds the annual taxe foncière into the monthly total and the net yield', () => {
    const montage: MontageFinancier = {
      prixAchat: 161000.21,
      prixTravaux: 0,
      tauxCredit: 2.9,
      dureeCreditAnnees: 25,
      loyerHypothese: 1200,
      pno: 20,
      assuranceEmprunteurMensuel: 20,
      chargesMensuelles: 170.0833333,
      taxeFonciere: 1200,
      enveloppeImprevus: 25,
      gestionGliPourcent: 7.5,
    };
    const resultat = calculMontageFinancier(montage);
    // Same scenario as above, plus 1200/12 = 100 €/month of taxe foncière.
    expect(resultat.totalMensualite).toBeCloseTo(1180.216963, 3);
    expect(resultat.cashflow).toBeCloseTo(19.7830369, 3);
    // Brut yield ignores charges entirely, so it is unaffected.
    expect(resultat.rendementBrutPourcent).toBeCloseTo(8.944, 3);
    expect(resultat.rendementNetPourcent).toBeCloseTo(6.931047, 3);
  });
});
