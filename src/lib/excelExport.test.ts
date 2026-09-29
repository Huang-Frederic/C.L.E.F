import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildWorkbookBuffer } from './excelExport';
import { createDefaultDataStore } from './defaultData';
import type { Bien } from './types';

function makeBien(overrides: Partial<Bien> = {}): Bien {
  return {
    id: 'b1',
    lienAnnonce: 'https://example.com/annonce',
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
    taxeFonciere: 1200,
    chargesCopro: 600,
    autresCharges: 0,
    classeEnergie: 'D',
    dateVisite: null,
    dateVente: null,
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
    ...overrides,
  };
}

describe('buildWorkbookBuffer', () => {
  it('writes the bien with its computed columns onto the Analyse sheet', async () => {
    const data = createDefaultDataStore();
    data.referentielLoyers = [{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }];
    data.biens = [makeBien()];

    const buffer = await buildWorkbookBuffer(data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const analyse = workbook.getWorksheet('Analyse');
    expect(analyse).toBeDefined();
    const row = analyse!.getRow(2);
    expect(row.getCell(1).value).toBe('https://example.com/annonce');
    expect(row.getCell(9).value as number).toBeCloseTo(1612.5, 4);
  });

  it('writes the référentiel loyers onto its own sheet', async () => {
    const data = createDefaultDataStore();
    data.referentielLoyers = [{ ville: 'Paris', typePiece: '2P', loyerM2: 29.3 }];

    const buffer = await buildWorkbookBuffer(data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const referentiel = workbook.getWorksheet('Aide Loyer Moyen');
    expect(referentiel!.getRow(2).getCell(1).value).toBe('Paris');
    expect(referentiel!.getRow(2).getCell(3).value).toBe(29.3);
  });
});
