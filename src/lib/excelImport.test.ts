import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseWorkbookBuffer } from './excelImport';

async function buildValidWorkbookBuffer(): Promise<Buffer> {
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
    { header: 'Taxe foncière /an', key: 'taxeFonciere' },
    { header: 'Charges copro /an', key: 'chargesCopro' },
    { header: 'Autres charges /an', key: 'autresCharges' },
    { header: 'Classe énergie', key: 'classeEnergie' },
    { header: 'Commentaire Antho', key: 'commentaireAntho' },
    { header: 'Commentaire Gilly', key: 'commentaireGilly' },
    { header: 'Commentaire décision', key: 'commentaireDecision' },
  ];
  analyse.addRow({
    lienAnnonce: 'https://example.com/a',
    lieu: 'Eaubonne',
    typePiece: '4P+',
    surfaceSol: 95,
    surfaceConfort: 30,
    prixAchat: 259000,
    prixTravaux: 5000,
    tauxCredit: 2,
    taxeFonciere: 1200,
    chargesCopro: 600,
    autresCharges: null,
    classeEnergie: 'D',
    commentaireAntho: '',
    commentaireGilly: '',
    commentaireDecision: '',
  });

  const referentiel = workbook.addWorksheet('Aide Loyer Moyen');
  referentiel.columns = [
    { header: 'Ville', key: 'ville' },
    { header: 'Type', key: 'typePiece' },
    { header: 'Loyer m2', key: 'loyerM2' },
  ];
  referentiel.addRow({ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 });

  const bareme = workbook.addWorksheet('Aide m2 supp confort');
  bareme.columns = [
    { header: 'Équipement', key: 'label' },
    { header: 'm2 bonus', key: 'm2Bonus' },
  ];
  bareme.addRow({ label: 'Eau courante', m2Bonus: 4 });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('parseWorkbookBuffer', () => {
  it('maps a valid workbook to a DataStore', async () => {
    const buffer = await buildValidWorkbookBuffer();
    const result = await parseWorkbookBuffer(buffer);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.data.biens).toHaveLength(1);
    expect(result.data.biens[0].lienAnnonce).toBe('https://example.com/a');
    expect(result.data.biens[0].surfaceSol).toBe(95);
    expect(result.data.referentielLoyers).toEqual([{ ville: 'Eaubonne', typePiece: '4P+', loyerM2: 12.9 }]);
    expect(result.data.baremeConfort).toEqual([{ label: 'Eau courante', m2Bonus: 4 }]);
  });

  it('maps a blank numeric cell to 0, not NaN', async () => {
    const buffer = await buildValidWorkbookBuffer();
    const result = await parseWorkbookBuffer(buffer);

    if (!result.ok) throw new Error('expected ok result');
    expect(result.data.biens[0].autresCharges).toBe(0);
  });

  it('rejects a workbook missing a required column, without returning partial data', async () => {
    const workbook = new ExcelJS.Workbook();
    const analyse = workbook.addWorksheet('Analyse');
    analyse.addRow(['Lieu', 'Type']); // 'Lien annonce' header missing
    workbook.addWorksheet('Aide Loyer Moyen');
    workbook.addWorksheet('Aide m2 supp confort');
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await parseWorkbookBuffer(buffer);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure result');
    expect(result.errors.some((e) => e.includes('Lien annonce'))).toBe(true);
  });

  it('rejects a workbook missing an entire required sheet', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Analyse');
    workbook.addWorksheet('Aide m2 supp confort');
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await parseWorkbookBuffer(buffer);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure result');
    expect(result.errors.some((e) => e.includes('Aide Loyer Moyen'))).toBe(true);
  });
});
