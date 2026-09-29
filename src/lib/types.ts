export interface Bien {
  id: string;
  lienAnnonce: string;
  lieu: string;
  typePiece: string;
  surfaceSol: number;
  surfaceConfort: number;
  equipements: Record<string, number> | null;
  prixAchat: number;
  prixTravaux: number;
  tauxCredit: number;
  dureeCreditAnnees: number;
  loyerM2Override: number | null;
  taxeFonciere: number;
  chargesCopro: number;
  autresCharges: number;
  classeEnergie: string;
  dateVisite: string | null;
  dateVente: string | null;
  commentaireAntho: string;
  commentaireGilly: string;
  commentaireDecision: string;
}

export interface ReferentielLoyer {
  ville: string;
  typePiece: string;
  loyerM2: number;
}

export interface BaremeConfortItem {
  label: string;
  m2Bonus: number;
}

export interface MontageFinancier {
  prixAchat: number;
  prixTravaux: number;
  tauxCredit: number;
  dureeCreditAnnees: number;
  loyerHypothese: number;
  pno: number;
  assuranceEmprunteurMensuel: number;
  chargesMensuelles: number;
  enveloppeImprevus: number;
  gestionGliPourcent: number;
}

export interface EmailTemplate {
  titre: string;
  corps: string;
}

export interface Settings {
  objectifRentabilitePourcent: number;
  tauxCreditParDefaut: number;
  dureeCreditParDefautAnnees: number;
}

export interface DataStore {
  biens: Bien[];
  referentielLoyers: ReferentielLoyer[];
  baremeConfort: BaremeConfortItem[];
  montageFinancier: MontageFinancier;
  emailTemplates: EmailTemplate[];
  settings: Settings;
}
