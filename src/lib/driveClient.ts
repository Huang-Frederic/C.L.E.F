import { google, drive_v3 } from 'googleapis';

type DriveFilesClient = drive_v3.Resource$Files;

function getAuth() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is not set.');
  const credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

export function createDriveFilesClient(): DriveFilesClient {
  return google.drive({ version: 'v3', auth: getAuth() }).files;
}

export async function getFileContent(fileId: string, filesClient = createDriveFilesClient()): Promise<string> {
  const res = await filesClient.get({ fileId, alt: 'media' }, { responseType: 'text' });
  return res.data as unknown as string;
}

export async function getFileModifiedTime(
  fileId: string,
  filesClient = createDriveFilesClient()
): Promise<string> {
  const res = await filesClient.get({ fileId, fields: 'modifiedTime' });
  return res.data.modifiedTime as string;
}

export async function updateFileContent(
  fileId: string,
  content: string,
  filesClient = createDriveFilesClient()
): Promise<string> {
  const res = await filesClient.update({
    fileId,
    media: { mimeType: 'application/json', body: content },
    fields: 'modifiedTime',
  });
  return res.data.modifiedTime as string;
}
