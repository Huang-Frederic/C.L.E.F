import { NextResponse } from 'next/server';
import { parseWorkbookBuffer } from '@/lib/excelImport';
import { loadData, saveData } from '@/lib/dataStore';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
  }

  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  if (!fileId) throw new Error('GOOGLE_DRIVE_FILE_ID is not set.');
  const { data: current, modifiedTime } = await loadData(fileId);

  const buffer = Buffer.from(await file.arrayBuffer());
  // The currently stored data is the base: sections the workbook doesn't carry
  // (emails / montage / paramètres in an older export) are kept instead of
  // being silently reset to the hardcoded defaults.
  const result = await parseWorkbookBuffer(buffer, current);
  if (!result.ok) {
    return NextResponse.json({ error: 'invalid', details: result.errors }, { status: 400 });
  }

  const newModifiedTime = await saveData(fileId, result.data, modifiedTime, true);
  return NextResponse.json({ ok: true, modifiedTime: newModifiedTime });
}
