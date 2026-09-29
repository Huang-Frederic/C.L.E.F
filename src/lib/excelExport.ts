import ExcelJS from 'exceljs';
import type { DataStore } from './types';
import {
  calculLoyerMoyenMensuel,
  calculMensualiteCredit,
  calculMensualiteBreakeven,
  calculRentabiliteNettePourcent,
  calculMaxEncheres,
} from './calculations';

export async function buildWorkbookBuffer(data: DataStore): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const analyse = workbook.addWorksheet('Analyse');
  analyse.columns = [
    { header: 'Lien annonce', key: 'lienAnnonce' },
    { header: 'Lieu', key: 'lieu' },
    { header: 'Type', key: 'typePiece' },
    { header: 'Surface sol m2', key: 'surfaceSol' },
    { header: 'Surface confort m2', key: 'surfaceConfort' },
    { header: 'Prix achat', key: 'prixAchat' },
    { header: 'Prix travaux', key: 'prixTravaux' },
    { header: 'Taux crédit %', key: 'tauxCredit' },
    { header: 'Loyer moyen mensuel', key: 'loyerMoyenMensuel' },
    { header: 'Mensualité crédit', key: 'mensualiteCredit' },
    { header: 'Taxe foncière /an', key: 'taxeFonciere' },
    { header: 'Charges copro /an', key: 'chargesCopro' },
    { header: 'Autres charges /an', key: 'autresCharges' },
    { header: 'Mensualité breakeven', key: 'mensualiteBreakeven' },
    { header: 'Rentabilité nette %', key: 'rentabiliteNette' },
    { header: 'Max enchères', key: 'maxEncheres' },
    { header: 'Classe énergie', key: 'classeEnergie' },
    { header: 'Commentaire Antho', key: 'commentaireAntho' },
    { header: 'Commentaire Gilly', key: 'commentaireGilly' },
    { header: 'Commentaire décision', key: 'commentaireDecision' },
  ];
  for (const bien of data.biens) {
    analyse.addRow({
      lienAnnonce: bien.lienAnnonce,
      lieu: bien.lieu,
      typePiece: bien.typePiece,
      surfaceSol: bien.surfaceSol,
      surfaceConfort: bien.surfaceConfort,
      prixAchat: bien.prixAchat,
      prixTravaux: bien.prixTravaux,
      tauxCredit: bien.tauxCredit,
      loyerMoyenMensuel: calculLoyerMoyenMensuel(bien, data.referentielLoyers),
      mensualiteCredit: calculMensualiteCredit(bien),
      taxeFonciere: bien.taxeFonciere,
      chargesCopro: bien.chargesCopro,
      autresCharges: bien.autresCharges,
      mensualiteBreakeven: calculMensualiteBreakeven(bien, data.referentielLoyers),
      rentabiliteNette: calculRentabiliteNettePourcent(bien, data.referentielLoyers),
      maxEncheres: calculMaxEncheres(bien, data.referentielLoyers, data.settings.objectifRentabilitePourcent),
      classeEnergie: bien.classeEnergie,
      commentaireAntho: bien.commentaireAntho,
      commentaireGilly: bien.commentaireGilly,
      commentaireDecision: bien.commentaireDecision,
    });
  }

  const referentiel = workbook.addWorksheet('Aide Loyer Moyen');
  referentiel.columns = [
    { header: 'Ville', key: 'ville' },
    { header: 'Type', key: 'typePiece' },
    { header: 'Loyer m2', key: 'loyerM2' },
  ];
  referentiel.addRows(data.referentielLoyers);

  const bareme = workbook.addWorksheet('Aide m2 supp confort');
  bareme.columns = [
    { header: 'Équipement', key: 'label' },
    { header: 'm2 bonus', key: 'm2Bonus' },
  ];
  bareme.addRows(data.baremeConfort);

  const emails = workbook.addWorksheet('Email');
  emails.columns = [
    { header: 'Titre', key: 'titre' },
    { header: 'Corps', key: 'corps' },
  ];
  emails.addRows(data.emailTemplates);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
