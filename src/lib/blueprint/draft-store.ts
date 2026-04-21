import { openDB, type IDBPDatabase } from 'idb';
import type { BlueprintAction } from './actions';
import type { BlueprintStructure } from './types';

const DB_NAME = 'langquest-blueprints';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

interface BlueprintDraft {
  blueprintId: string;
  baseVersion: number;
  structure: BlueprintStructure;
  actionLog: BlueprintAction[];
  actionIndex: number;
  savedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'blueprintId' });
        }
      }
    });
  }
  return dbPromise;
}

export async function saveDraft(draft: BlueprintDraft): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, { ...draft, savedAt: Date.now() });
}

export async function loadDraft(
  blueprintId: string
): Promise<BlueprintDraft | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, blueprintId);
}

export async function deleteDraft(blueprintId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, blueprintId);
}

export async function listDrafts(): Promise<BlueprintDraft[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function hasDraft(blueprintId: string): Promise<boolean> {
  const db = await getDb();
  const draft = await db.get(STORE_NAME, blueprintId);
  return draft !== undefined;
}
