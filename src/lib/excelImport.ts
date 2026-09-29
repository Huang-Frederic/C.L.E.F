import ExcelJS from 'exceljs';
import { randomUUID } from 'node:crypto';
import type { Bien, BaremeConfortItem, DataStore, ReferentielLoyer } from './types';
import { createDefaultDataStore } from './defaultData';
import {
  ANALYSE_OPTIONAL,
  ANALYSE_REQUIRED,
  BAREME_HEADERS,
  EMAIL_HEADERS,
  MONTAGE_HEADERS,
  REFERENTIEL_HEADERS,
  REQUIRED_ANALYSE_HEADERS,
  REQUIRED_BAREME_HEADERS,
  REQUIRED_REFERENTIEL_HEADERS,
  SETTINGS_HEADERS,
  SHEET_ANALYSE,
  SHEET_BAREME,
  SHEET_EMAIL,
  SHEET_MONTAGE,
  SHEET_REFERENTIEL,
  SHEET_SETTINGS,
} from './excelColumns';

export type ImportResult = { ok: true; data: DataStore } | { ok: false; errors: string[] };

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

/** Empty cell -> null, otherwise a finite number. */
function toNullableNumber(value: ExcelJS.CellValue): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Empty cell -> null, otherwise the trimmed string. */
function toNullableString(value: ExcelJS.CellValue): string | null {
  const s = toSafeString(value).trim();
  return s === '' ? null : s;
}

/**
 * `null` means "surfaceConfort is a manual override"; anything unparseable is
 * treated the same way rather than silently inventing an empty breakdown.
 */
function toEquipements(value: ExcelJS.CellValue): Record<string, number> | null {
  const raw = toSafeString(value).trim();
  if (raw === '') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(val);
      if (Number.isFinite(n)) result[key] = n;
    }
    return result;
  } catch {
    return null;
  }
}

/** Reads a cell by header name; returns undefined when the column is absent. */
function cellReader(row: ExcelJS.Row, headers: string[]) {
  return (header: string): ExcelJS.CellValue | undefined => {
    const index = headers.indexOf(header);
    if (index === -1) return undefined;
    return row.getCell(index + 1).value;
  };
}

/**
 * @param base data to start from (a deep copy is used). Sections a workbook
 *   doesn't carry — e.g. an old export with no "Email"/"Montage financier"/
 *   "Paramètres" sheet — keep the value they have in `base` instead of being
 *   reset to the hardcoded defaults. Defaults to a fresh default store.
 */
export async function parseWorkbookBuffer(buffer: Buffer, base?: DataStore): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's own type declarations resolve to a different (older, non-generic)
  // ambient `Buffer` type than this project's @types/node, due to a duplicate
  // @types/node nested under a transitive dependency (fast-csv). The buffer
  // value is a real Node Buffer at runtime; the cast below is only needed to
  // satisfy that structurally-incompatible-but-nominally-identical type.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const analyseSheet = workbook.getWorksheet(SHEET_ANALYSE);
  const referentielSheet = workbook.getWorksheet(SHEET_REFERENTIEL);
  const baremeSheet = workbook.getWorksheet(SHEET_BAREME);
  // Optional sheets: a workbook exported before they existed must still import.
  const emailSheet = workbook.getWorksheet(SHEET_EMAIL);
  const montageSheet = workbook.getWorksheet(SHEET_MONTAGE);
  const settingsSheet = workbook.getWorksheet(SHEET_SETTINGS);

  const errors: string[] = [];
  if (!analyseSheet) errors.push(`Feuille "${SHEET_ANALYSE}" manquante.`);
  if (!referentielSheet) errors.push(`Feuille "${SHEET_REFERENTIEL}" manquante.`);
  if (!baremeSheet) errors.push(`Feuille "${SHEET_BAREME}" manquante.`);

  const analyseHeaders = readHeaderRow(analyseSheet);
  const referentielHeaders = readHeaderRow(referentielSheet);
  const baremeHeaders = readHeaderRow(baremeSheet);
  const emailHeaders = readHeaderRow(emailSheet);
  const montageHeaders = readHeaderRow(montageSheet);
  const settingsHeaders = readHeaderRow(settingsSheet);

  if (analyseSheet) {
    missingHeaders(analyseHeaders, REQUIRED_ANALYSE_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "${SHEET_ANALYSE}".`)
    );
  }
  if (referentielSheet) {
    missingHeaders(referentielHeaders, REQUIRED_REFERENTIEL_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "${SHEET_REFERENTIEL}".`)
    );
  }
  if (baremeSheet) {
    missingHeaders(baremeHeaders, REQUIRED_BAREME_HEADERS).forEach((h) =>
      errors.push(`Colonne "${h}" manquante dans la feuille "${SHEET_BAREME}".`)
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Deep copy so we never mutate the caller's store.
  const data: DataStore = base
    ? (JSON.parse(JSON.stringify(base)) as DataStore)
    : createDefaultDataStore();
  data.biens = [];
  data.referentielLoyers = [];

  // Settings are read first: they provide the fallback credit duration used
  // below for biens coming from a workbook without that column.
  if (settingsSheet) {
    const cell = cellReader(settingsSheet.getRow(2), settingsHeaders);
    for (const key of Object.keys(SETTINGS_HEADERS) as Array<keyof typeof SETTINGS_HEADERS>) {
      const value = toNullableNumber(cell(SETTINGS_HEADERS[key]));
      if (value !== null) data.settings[key] = value;
    }
  }

  if (montageSheet) {
    const cell = cellReader(montageSheet.getRow(2), montageHeaders);
    for (const key of Object.keys(MONTAGE_HEADERS) as Array<keyof typeof MONTAGE_HEADERS>) {
      const value = toNullableNumber(cell(MONTAGE_HEADERS[key]));
      if (value !== null) data.montageFinancier[key] = value;
    }
  }

  analyseSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = cellReader(row, analyseHeaders);
    const bien: Bien = {
      id: randomUUID(),
      lienAnnonce: toSafeString(cell(ANALYSE_REQUIRED.lienAnnonce)),
      lieu: toSafeString(cell(ANALYSE_REQUIRED.lieu)),
      typePiece: toSafeString(cell(ANALYSE_REQUIRED.typePiece)),
      surfaceSol: toSafeNumber(cell(ANALYSE_REQUIRED.surfaceSol)),
      surfaceConfort: toSafeNumber(cell(ANALYSE_REQUIRED.surfaceConfort)),
      equipements: toEquipements(cell(ANALYSE_OPTIONAL.equipements)),
      prixAchat: toSafeNumber(cell(ANALYSE_REQUIRED.prixAchat)),
      prixTravaux: toSafeNumber(cell(ANALYSE_REQUIRED.prixTravaux)),
      tauxCredit: toSafeNumber(cell(ANALYSE_REQUIRED.tauxCredit)),
      dureeCreditAnnees:
        toNullableNumber(cell(ANALYSE_OPTIONAL.dureeCreditAnnees)) ??
        data.settings.dureeCreditParDefautAnnees,
      loyerM2Override: toNullableNumber(cell(ANALYSE_OPTIONAL.loyerM2Override)),
      taxeFonciere: toSafeNumber(cell(ANALYSE_REQUIRED.taxeFonciere)),
      chargesCopro: toSafeNumber(cell(ANALYSE_REQUIRED.chargesCopro)),
      autresCharges: toSafeNumber(cell(ANALYSE_REQUIRED.autresCharges)),
      classeEnergie: toSafeString(cell(ANALYSE_REQUIRED.classeEnergie)),
      dateVisite: toNullableString(cell(ANALYSE_OPTIONAL.dateVisite)),
      dateVente: toNullableString(cell(ANALYSE_OPTIONAL.dateVente)),
      commentaireAntho: toSafeString(cell(ANALYSE_REQUIRED.commentaireAntho)),
      commentaireGilly: toSafeString(cell(ANALYSE_REQUIRED.commentaireGilly)),
      commentaireDecision: toSafeString(cell(ANALYSE_REQUIRED.commentaireDecision)),
    };
    data.biens.push(bien);
  });

  referentielSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = cellReader(row, referentielHeaders);
    const entry: ReferentielLoyer = {
      ville: toSafeString(cell(REFERENTIEL_HEADERS.ville)),
      typePiece: toSafeString(cell(REFERENTIEL_HEADERS.typePiece)),
      loyerM2: toSafeNumber(cell(REFERENTIEL_HEADERS.loyerM2)),
    };
    data.referentielLoyers.push(entry);
  });

  data.baremeConfort = [];
  baremeSheet!.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = cellReader(row, baremeHeaders);
    const entry: BaremeConfortItem = {
      label: toSafeString(cell(BAREME_HEADERS.label)),
      m2Bonus: toSafeNumber(cell(BAREME_HEADERS.m2Bonus)),
    };
    data.baremeConfort.push(entry);
  });

  if (emailSheet && emailHeaders.includes(EMAIL_HEADERS.titre)) {
    data.emailTemplates = [];
    emailSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cell = cellReader(row, emailHeaders);
      data.emailTemplates.push({
        titre: toSafeString(cell(EMAIL_HEADERS.titre)),
        corps: toSafeString(cell(EMAIL_HEADERS.corps)),
      });
    });
  }

  return { ok: true, data };
}
