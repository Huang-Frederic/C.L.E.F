import type { Bien, DataStore, Settings } from './types';

export function createDefaultDataStore(): DataStore {
  return {
    biens: [],
    referentielLoyers: [],
    baremeConfort: [
      { label: 'Eau courante', m2Bonus: 4 },
      { label: 'Gaz', m2Bonus: 2 },
      { label: 'Électricité', m2Bonus: 2 },
      { label: 'Lavabo', m2Bonus: 3 },
      { label: 'WC', m2Bonus: 3 },
      { label: 'Baignoire', m2Bonus: 5 },
      { label: 'Douche', m2Bonus: 4 },
      { label: 'Chauffage par pièce', m2Bonus: 2 },
    ],
    montageFinancier: {
      prixAchat: 0,
      prixTravaux: 0,
      tauxCredit: 3,
      dureeCreditAnnees: 25,
      loyerHypothese: 0,
      pno: 0,
      assuranceEmprunteurMensuel: 0,
      chargesMensuelles: 0,
      enveloppeImprevus: 0,
      gestionGliPourcent: 7.5,
    },
    emailTemplates: [],
    settings: {
      objectifRentabilitePourcent: 6,
      tauxCreditParDefaut: 3,
      dureeCreditParDefautAnnees: 25,
    },
  };
}

/**
 * A brand-new bien seeds its credit terms from the user-editable settings
 * rather than from hardcoded constants.
 */
export function createEmptyBien(id: string, settings: Settings): Bien {
  return {
    id,
    lienAnnonce: '',
    lieu: '',
    typePiece: '',
    surfaceSol: 0,
    surfaceConfort: 0,
    equipements: {},
    prixAchat: 0,
    prixTravaux: 0,
    tauxCredit: settings.tauxCreditParDefaut,
    dureeCreditAnnees: settings.dureeCreditParDefautAnnees,
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
  };
}
