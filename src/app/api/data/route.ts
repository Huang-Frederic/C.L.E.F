import { NextResponse } from 'next/server';
import { loadData, saveData, SaveConflictError } from '@/lib/dataStore';
import type { DataStore } from '@/lib/types';

// This route always reads/writes the live Google Drive file and must never
// be statically prerendered or cached at build time.
export const dynamic = 'force-dynamic';

function getFileId(): string {
  const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
  if (!fileId) throw new Error('GOOGLE_DRIVE_FILE_ID is not set.');
  return fileId;
}

export async function GET() {
  const { data, modifiedTime } = await loadData(getFileId());
  return NextResponse.json({ data, modifiedTime });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    data: DataStore;
    expectedModifiedTime: string;
    force?: boolean;
  };
  try {
    const modifiedTime = await saveData(getFileId(), body.data, body.expectedModifiedTime, body.force ?? false);
    return NextResponse.json({ ok: true, modifiedTime });
  } catch (error) {
    if (error instanceof SaveConflictError) {
      return NextResponse.json(
        { error: 'conflict', currentModifiedTime: error.currentModifiedTime },
        { status: 409 }
      );
    }
    throw error;
  }
}
