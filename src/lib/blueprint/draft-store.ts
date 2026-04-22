import { openDB, type IDBPDatabase } from 'idb';
import type { BlueprintAction } from './actions';
import type { BlueprintStructure, DraftMode } from './types';

const DB_NAME = 'langquest-blueprints';
const DB_VERSION = 2;
const STORE_NAME = 'drafts';

export interface BlueprintDraft {
  draftId: string;
  sourceBlueprintId: string | null;
  mode: DraftMode;
  structure: BlueprintStructure;
  actionLog: BlueprintAction[];
  actionIndex: number;
  metadata: { name: string; icon: string | null; shared: boolean };
  targetLinkIds: string[];
  savedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains(STORE_NAME)) {
            db.deleteObjectStore(STORE_NAME);
          }
        }
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'draftId' });
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
  draftId: string
): Promise<BlueprintDraft | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, draftId);
}

export async function deleteDraft(draftId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, draftId);
}

export async function listDrafts(): Promise<BlueprintDraft[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}
