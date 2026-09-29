import { NextResponse } from 'next/server';
import { parseWorkbookBuffer } from '@/lib/excelImport';
import { loadData, saveData } from '@/lib/dataStore';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await parseWorkbookBuffer(buffer);
  if (!result.ok) {
    return NextResponse.json({ error: 'invalid', details: result.errors }, { status: 400 });
  }

  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  if (!fileId) throw new Error('GOOGLE_DRIVE_FILE_ID is not set.');
  const { modifiedTime } = await loadData(fileId);
  const newModifiedTime = await saveData(fileId, result.data, modifiedTime, true);
  return NextResponse.json({ ok: true, modifiedTime: newModifiedTime });
}
