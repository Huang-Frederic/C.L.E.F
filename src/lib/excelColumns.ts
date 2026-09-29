import type { MontageFinancier, Settings } from './types';

/**
 * Single source of truth for the Excel sheet names and column headers shared by
 * `excelExport.ts` and `excelImport.ts`. Previously each file declared its own
 * copies of these strings and they had to be kept in sync by hand.
 */

export const SHEET_ANALYSE = 'Analyse';
export const SHEET_REFERENTIEL = 'Aide Loyer Moyen';
export const SHEET_BAREME = 'Aide m2 supp confort';
export const SHEET_EMAIL = 'Email';
export const SHEET_MONTAGE = 'Montage financier';
export const SHEET_SETTINGS = 'Paramètres';

/** Headers of the "Analyse" sheet that an imported workbook MUST provide. */
export const ANALYSE_REQUIRED = {
  lienAnnonce: 'Lien annonce',
  lieu: 'Lieu',
  typePiece: 'Type',
  surfaceSol: 'Surface sol m2',
  surfaceConfort: 'Surface confort m2',
  prixAchat: 'Prix achat',
  prixTravaux: 'Prix travaux',
  tauxCredit: 'Taux crédit %',
  taxeFonciere: 'Taxe foncière /an',
  chargesCopro: 'Charges copro /an',
  autresCharges: 'Autres charges /an',
  classeEnergie: 'Classe énergie',
  commentaireAntho: 'Commentaire Antho',
  commentaireGilly: 'Commentaire Gilly',
  commentaireDecision: 'Commentaire décision',
} as const;

/**
 * Headers we also export and read back, but which are tolerated as missing so
 * that a workbook produced before they existed still imports.
 */
export const ANALYSE_OPTIONAL = {
  dureeCreditAnnees: 'Durée crédit (années)',
  loyerM2Override: 'Loyer m2 surcharge',
  equipements: 'Équipements (JSON)',
  dateVisite: 'Date visite',
  dateVente: 'Date vente',
} as const;

/** Columns computed at export time and never read back on import. */
export const ANALYSE_COMPUTED = {
  loyerMoyenMensuel: 'Loyer moyen mensuel',
  mensualiteCredit: 'Mensualité crédit',
  mensualiteBreakeven: 'Mensualité breakeven',
  rentabiliteNette: 'Rentabilité nette %',
  maxEncheres: 'Max enchères',
} as const;

export const REQUIRED_ANALYSE_HEADERS: string[] = Object.values(ANALYSE_REQUIRED);

export const REFERENTIEL_HEADERS = {
  ville: 'Ville',
  typePiece: 'Type',
  loyerM2: 'Loyer m2',
} as const;
export const REQUIRED_REFERENTIEL_HEADERS: string[] = Object.values(REFERENTIEL_HEADERS);

export const BAREME_HEADERS = {
  label: 'Équipement',
  m2Bonus: 'm2 bonus',
} as const;
export const REQUIRED_BAREME_HEADERS: string[] = Object.values(BAREME_HEADERS);

export const EMAIL_HEADERS = {
  titre: 'Titre',
  corps: 'Corps',
} as const;

export const MONTAGE_HEADERS: Record<keyof MontageFinancier, string> = {
  prixAchat: 'Prix achat',
  prixTravaux: 'Prix travaux',
  tauxCredit: 'Taux crédit %',
  dureeCreditAnnees: 'Durée crédit (années)',
  loyerHypothese: 'Loyer hypothèse',
  pno: 'PNO',
  assuranceEmprunteurMensuel: 'Assurance emprunteur / mois',
  chargesMensuelles: 'Charges mensuelles',
  enveloppeImprevus: 'Enveloppe imprévus',
  gestionGliPourcent: 'Gestion + GLI %',
};

export const SETTINGS_HEADERS: Record<keyof Settings, string> = {
  objectifRentabilitePourcent: 'Objectif rentabilité %',
  tauxCreditParDefaut: 'Taux crédit par défaut %',
  dureeCreditParDefautAnnees: 'Durée crédit par défaut (années)',
};
