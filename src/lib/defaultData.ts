import type { Bien, DataStore } from './types';

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

export function createEmptyBien(id: string): Bien {
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
  };
}
