import type { DataStore } from './types';
import { createDefaultDataStore } from './defaultData';
import { getFileContent, getFileModifiedTime, updateFileContent } from './driveClient';

export class SaveConflictError extends Error {
  currentModifiedTime: string;

  constructor(currentModifiedTime: string) {
    super("Le fichier a été modifié par quelqu'un d'autre depuis le dernier chargement.");
    this.name = 'SaveConflictError';
    this.currentModifiedTime = currentModifiedTime;
  }
}

export interface LoadedData {
  data: DataStore;
  modifiedTime: string;
}

export async function loadData(fileId: string): Promise<LoadedData> {
  const [content, modifiedTime] = await Promise.all([
    getFileContent(fileId),
    getFileModifiedTime(fileId),
  ]);
  const data: DataStore = content.trim().length > 0 ? JSON.parse(content) : createDefaultDataStore();
  return { data, modifiedTime };
}

export async function saveData(
  fileId: string,
  data: DataStore,
  expectedModifiedTime: string,
  force = false
): Promise<string> {
  if (!force) {
    const current = await getFileModifiedTime(fileId);
    if (current !== expectedModifiedTime) {
      throw new SaveConflictError(current);
    }
  }
  return updateFileContent(fileId, JSON.stringify(data, null, 2));
}
