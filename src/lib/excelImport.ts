import ExcelJS from 'exceljs';
import { randomUUID } from 'node:crypto';
import type { Bien, BaremeConfortItem, DataStore, ReferentielLoyer } from './types';
import { createDefaultDataStore } from './defaultData';

export type ImportResult = { ok: true; data: DataStore } | { ok: false; errors: string[] };

const REQUIRED_ANALYSE_HEADERS = [
  'Lien annonce',
  'Lieu',
  'Type',
  'Surface sol m2',
  'Surface confort m2',
  'Prix achat',
  'Prix travaux',
  'Taux crédit %',
  'Taxe foncière /an',
  'Charges copro /an',
  'Autres charges /an',
  'Classe énergie',
  'Commentaire Antho',
  'Commentaire Gilly',
  'Commentaire décision',
];
const REQUIRED_REFERENTIEL_HEADERS = ['Ville', 'Type', 'Loyer m2'];
const REQUIRED_BAREME_HEADERS = ['Équipement', 'm2 bonus'];

function readHeaderRow(sheet: ExcelJS.Worksheet | undefined): string[] {
  if (!sheet) return [];
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });
  return headers;
}

function missingHeaders(actual: string[], required: string[]): string[] {
  return required.filter((header) => !actual.includes(header));
}

function toSafeNumber(value: ExcelJS.CellValue): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toSafeString(value: ExcelJS.CellValue): string {
  return value == null ? '' : String(value);
}

export async function parseWorkbookBuffer(buffer: Buffer): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's own type declarations resolve to a different (older, non-generic)
  // ambient `Buffer` type than this project's @types/node, due to a duplicate
  // @types/node nested under a transitive dependency (fast-csv). The buffer
  // value is a real Node Buffer at runtime; the cast below is only needed to
  // satisfy that structurally-incompatible-but-nominally-identical type.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const analyseSheet = workbook.getWorksheet('Analyse');
  const referentielSheet = workbook.getWorksheet('Aide Loyer Moyen');
  const baremeSheet = workbook.getWorksheet('Aide m2 supp confort');

  const errors: string[] = [];
  if (!analyseSheet) errors.push('Feuille "Analyse" manquante.');
  if (!referentielSheet) errors.push('Feuille "Aide Loyer Moyen" manquante.');
  if (!baremeSheet) errors.push('Feuille "Aide m2 supp confort" manquante.');

  const analyseHeaders = readHeaderRow(analyseSheet);
  const referentielHeaders = readHeaderRow(referentielSheet);
  const baremeHeaders = readHeaderRow(baremeSheet);

  if (analyseSheet) {
    missingHeaders(analyseHeaders, REQUIRED_ANALYSE_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "Analyse".`)
    );
  }
  if (referentielSheet) {
    missingHeaders(referentielHeaders, REQUIRED_REFERENTIEL_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "Aide Loyer Moyen".`)
    );
  }
  if (baremeSheet) {
    missingHeaders(baremeHeaders, REQUIRED_BAREME_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "Aide m2 supp confort".`)
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const data = createDefaultDataStore();

  analyseSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = (header: string) => row.getCell(analyseHeaders.indexOf(header) + 1).value;
    const bien: Bien = {
      id: randomUUID(),
      lienAnnonce: toSafeString(cell('Lien annonce')),
      lieu: toSafeString(cell('Lieu')),
      typePiece: toSafeString(cell('Type')),
      surfaceSol: toSafeNumber(cell('Surface sol m2')),
      surfaceConfort: toSafeNumber(cell('Surface confort m2')),
      equipements: null,
      prixAchat: toSafeNumber(cell('Prix achat')),
      prixTravaux: toSafeNumber(cell('Prix travaux')),
      tauxCredit: toSafeNumber(cell('Taux crédit %')),
      dureeCreditAnnees: 25,
      loyerM2Override: null,
      taxeFonciere: toSafeNumber(cell('Taxe foncière /an')),
      chargesCopro: toSafeNumber(cell('Charges copro /an')),
      autresCharges: toSafeNumber(cell('Autres charges /an')),
      classeEnergie: toSafeString(cell('Classe énergie')),
      dateVisite: null,
      dateVente: null,
      commentaireAntho: toSafeString(cell('Commentaire Antho')),
      commentaireGilly: toSafeString(cell('Commentaire Gilly')),
      commentaireDecision: toSafeString(cell('Commentaire décision')),
    };
    data.biens.push(bien);
  });

  referentielSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = (header: string) => row.getCell(referentielHeaders.indexOf(header) + 1).value;
    const entry: ReferentielLoyer = {
      ville: toSafeString(cell('Ville')),
      typePiece: toSafeString(cell('Type')),
      loyerM2: toSafeNumber(cell('Loyer m2')),
    };
    data.referentielLoyers.push(entry);
  });

  data.baremeConfort = [];
  baremeSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = (header: string) => row.getCell(baremeHeaders.indexOf(header) + 1).value;
    const entry: BaremeConfortItem = {
      label: toSafeString(cell('Équipement')),
      m2Bonus: toSafeNumber(cell('m2 bonus')),
    };
    data.baremeConfort.push(entry);
  });

  return { ok: true, data };
}
