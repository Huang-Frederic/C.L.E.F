import { NextResponse } from 'next/server';
import { loadData } from '@/lib/dataStore';
import { buildWorkbookBuffer } from '@/lib/excelExport';

// This route always reads the live Google Drive file and must never be
// statically prerendered or cached at build time.
export const dynamic = 'force-dynamic';

export async function GET() {
  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  if (!fileId) throw new Error('GOOGLE_DRIVE_FILE_ID is not set.');
  const { data } = await loadData(fileId);
  const buffer = await buildWorkbookBuffer(data);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Immo.xlsx"',
    },
  });
}
