import ExcelJS from 'exceljs';
import type { DataStore } from './types';
import {
  calculLoyerMoyenMensuel,
  calculMensualiteCredit,
  calculMensualiteBreakeven,
  calculRentabiliteNettePourcent,
  calculMaxEncheres,
} from './calculations';
import {
  ANALYSE_COMPUTED,
  ANALYSE_OPTIONAL,
  ANALYSE_REQUIRED,
  BAREME_HEADERS,
  EMAIL_HEADERS,
  MONTAGE_HEADERS,
  REFERENTIEL_HEADERS,
  SETTINGS_HEADERS,
  SHEET_ANALYSE,
  SHEET_BAREME,
  SHEET_EMAIL,
  SHEET_MONTAGE,
  SHEET_REFERENTIEL,
  SHEET_SETTINGS,
} from './excelColumns';

export async function buildWorkbookBuffer(data: DataStore): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const analyse = workbook.addWorksheet(SHEET_ANALYSE);
  analyse.columns = [
    { header: ANALYSE_REQUIRED.lienAnnonce, key: 'lienAnnonce' },
    { header: ANALYSE_REQUIRED.lieu, key: 'lieu' },
    { header: ANALYSE_REQUIRED.typePiece, key: 'typePiece' },
    { header: ANALYSE_REQUIRED.surfaceSol, key: 'surfaceSol' },
    { header: ANALYSE_REQUIRED.surfaceConfort, key: 'surfaceConfort' },
    { header: ANALYSE_REQUIRED.prixAchat, key: 'prixAchat' },
    { header: ANALYSE_REQUIRED.prixTravaux, key: 'prixTravaux' },
    { header: ANALYSE_REQUIRED.tauxCredit, key: 'tauxCredit' },
    { header: ANALYSE_COMPUTED.loyerMoyenMensuel, key: 'loyerMoyenMensuel' },
    { header: ANALYSE_COMPUTED.mensualiteCredit, key: 'mensualiteCredit' },
    { header: ANALYSE_REQUIRED.taxeFonciere, key: 'taxeFonciere' },
    { header: ANALYSE_REQUIRED.chargesCopro, key: 'chargesCopro' },
    { header: ANALYSE_REQUIRED.autresCharges, key: 'autresCharges' },
    { header: ANALYSE_COMPUTED.mensualiteBreakeven, key: 'mensualiteBreakeven' },
    { header: ANALYSE_COMPUTED.rentabiliteNette, key: 'rentabiliteNette' },
    { header: ANALYSE_COMPUTED.maxEncheres, key: 'maxEncheres' },
    { header: ANALYSE_REQUIRED.classeEnergie, key: 'classeEnergie' },
    { header: ANALYSE_REQUIRED.commentaireAntho, key: 'commentaireAntho' },
    { header: ANALYSE_REQUIRED.commentaireGilly, key: 'commentaireGilly' },
    { header: ANALYSE_REQUIRED.commentaireDecision, key: 'commentaireDecision' },
    // Stored-but-not-computed fields, appended so the historical column order
    // of the sheet above is preserved.
    { header: ANALYSE_OPTIONAL.dureeCreditAnnees, key: 'dureeCreditAnnees' },
    { header: ANALYSE_OPTIONAL.loyerM2Override, key: 'loyerM2Override' },
    { header: ANALYSE_OPTIONAL.equipements, key: 'equipements' },
    { header: ANALYSE_OPTIONAL.dateVisite, key: 'dateVisite' },
    { header: ANALYSE_OPTIONAL.dateVente, key: 'dateVente' },
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
      dureeCreditAnnees: bien.dureeCreditAnnees,
      loyerM2Override: bien.loyerM2Override,
      // Serialised so the equipment breakdown (and the `null` = "surfaceConfort
      // is a manual override" marker) survives a round-trip.
      equipements: bien.equipements === null ? '' : JSON.stringify(bien.equipements),
      dateVisite: bien.dateVisite ?? '',
      dateVente: bien.dateVente ?? '',
    });
  }

  const referentiel = workbook.addWorksheet(SHEET_REFERENTIEL);
  referentiel.columns = [
    { header: REFERENTIEL_HEADERS.ville, key: 'ville' },
    { header: REFERENTIEL_HEADERS.typePiece, key: 'typePiece' },
    { header: REFERENTIEL_HEADERS.loyerM2, key: 'loyerM2' },
  ];
  referentiel.addRows(data.referentielLoyers);

  const bareme = workbook.addWorksheet(SHEET_BAREME);
  bareme.columns = [
    { header: BAREME_HEADERS.label, key: 'label' },
    { header: BAREME_HEADERS.m2Bonus, key: 'm2Bonus' },
  ];
  bareme.addRows(data.baremeConfort);

  const emails = workbook.addWorksheet(SHEET_EMAIL);
  emails.columns = [
    { header: EMAIL_HEADERS.titre, key: 'titre' },
    { header: EMAIL_HEADERS.corps, key: 'corps' },
  ];
  emails.addRows(data.emailTemplates);

  const montage = workbook.addWorksheet(SHEET_MONTAGE);
  montage.columns = (Object.keys(MONTAGE_HEADERS) as Array<keyof typeof MONTAGE_HEADERS>).map((key) => ({
    header: MONTAGE_HEADERS[key],
    key,
  }));
  montage.addRow(data.montageFinancier);

  const settings = workbook.addWorksheet(SHEET_SETTINGS);
  settings.columns = (Object.keys(SETTINGS_HEADERS) as Array<keyof typeof SETTINGS_HEADERS>).map((key) => ({
    header: SETTINGS_HEADERS[key],
    key,
  }));
  settings.addRow(data.settings);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
