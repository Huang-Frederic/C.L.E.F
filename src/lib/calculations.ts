import type { Bien, ReferentielLoyer, MontageFinancier } from './types';

export function calculPmtMensuel(
  capital: number,
  tauxAnnuelPourcent: number,
  dureeAnnees: number
): number {
  const tauxMensuel = tauxAnnuelPourcent / 100 / 12;
  const nombreMensualites = dureeAnnees * 12;
  if (nombreMensualites <= 0) return 0;
  if (tauxMensuel === 0) return capital / nombreMensualites;
  return (capital * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nombreMensualites));
}

export function trouverLoyerM2(bien: Bien, referentielLoyers: ReferentielLoyer[]): number | null {
  if (bien.loyerM2Override !== null) return bien.loyerM2Override;
  const entry = referentielLoyers.find(
    (r) => r.ville === bien.lieu && r.typePiece === bien.typePiece
  );
  return entry ? entry.loyerM2 : null;
}

export function calculLoyerMoyenMensuel(bien: Bien, referentielLoyers: ReferentielLoyer[]): number {
  const loyerM2 = trouverLoyerM2(bien, referentielLoyers) ?? 0;
  return loyerM2 * (bien.surfaceSol + bien.surfaceConfort);
}

export function calculMensualiteCredit(bien: Bien): number {
  return calculPmtMensuel(bien.prixAchat + bien.prixTravaux, bien.tauxCredit, bien.dureeCreditAnnees);
}

function chargesMensuellesFixes(bien: Bien): number {
  return (bien.taxeFonciere + bien.chargesCopro + bien.autresCharges) / 12;
}

export function calculMensualiteBreakeven(bien: Bien, referentielLoyers: ReferentielLoyer[]): number {
  return calculMensualiteCredit(bien) + chargesMensuellesFixes(bien);
}

export function calculRentabiliteNettePourcent(
  bien: Bien,
  referentielLoyers: ReferentielLoyer[]
): number {
  const capital = bien.prixAchat + bien.prixTravaux;
  if (capital <= 0) return 0;
  const loyerNetMensuel = calculLoyerMoyenMensuel(bien, referentielLoyers) - chargesMensuellesFixes(bien);
  return (loyerNetMensuel / capital) * 1200;
}

export function calculMaxEncheres(
  bien: Bien,
  referentielLoyers: ReferentielLoyer[],
  objectifRentabilitePourcent: number
): number {
  if (objectifRentabilitePourcent <= 0) return 0;
  const loyerNetMensuel = calculLoyerMoyenMensuel(bien, referentielLoyers) - chargesMensuellesFixes(bien);
  return (loyerNetMensuel * 12) / (objectifRentabilitePourcent / 100);
}

export interface MontageFinancierResultat {
  mensualiteBanque: number;
  gestionGli: number;
  totalMensualite: number;
  cashflow: number;
  rendementBrutPourcent: number;
  rendementNetPourcent: number;
}

export function calculMontageFinancier(m: MontageFinancier): MontageFinancierResultat {
  const capital = m.prixAchat + m.prixTravaux;
  const mensualiteBanque = calculPmtMensuel(capital, m.tauxCredit, m.dureeCreditAnnees);
  const gestionGli = m.loyerHypothese * (m.gestionGliPourcent / 100);
  const taxeFonciereMensuelle = m.taxeFonciere / 12;
  const totalMensualite =
    mensualiteBanque +
    m.pno +
    m.assuranceEmprunteurMensuel +
    m.chargesMensuelles +
    taxeFonciereMensuelle +
    m.enveloppeImprevus +
    gestionGli;
  const cashflow = m.loyerHypothese - totalMensualite;
  const rendementBrutPourcent = capital > 0 ? (m.loyerHypothese * 12) / capital * 100 : 0;
  const rendementNetPourcent =
    capital > 0 ? ((m.loyerHypothese - m.chargesMensuelles - taxeFonciereMensuelle) * 12) / capital * 100 : 0;
  return { mensualiteBanque, gestionGli, totalMensualite, cashflow, rendementBrutPourcent, rendementNetPourcent };
}
