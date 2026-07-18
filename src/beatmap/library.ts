import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface LibraryEntry {
  id: string;
  label: string;
  addedAt: number;
  byteLength: number;
  difficultyCount: number;
}

interface LibraryDB extends DBSchema {
  meta: { key: string; value: LibraryEntry };
  files: { key: string; value: { id: string; bytes: Uint8Array } };
}

let dbPromise: Promise<IDBPDatabase<LibraryDB>> | undefined;

function db(): Promise<IDBPDatabase<LibraryDB>> {
  dbPromise ??= openDB<LibraryDB>('airosu-library', 1, {
    upgrade(d) {
      d.createObjectStore('meta', { keyPath: 'id' });
      d.createObjectStore('files', { keyPath: 'id' });
    },
  });
  return dbPromise;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice().buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Saves a mapset keyed by content hash; identical bytes overwrite in place. */
export async function saveMapset(
  bytes: Uint8Array,
  label: string,
  difficultyCount: number,
): Promise<LibraryEntry> {
  const id = await sha256Hex(bytes);
  const entry: LibraryEntry = {
    id,
    label,
    addedAt: Date.now(),
    byteLength: bytes.byteLength,
    difficultyCount,
  };
  const d = await db();
  const tx = d.transaction(['meta', 'files'], 'readwrite');
  await tx.objectStore('meta').put(entry);
  await tx.objectStore('files').put({ id, bytes });
  await tx.done;
  return entry;
}

/** Newest first; metadata only, no bytes. */
export async function listMapsets(): Promise<LibraryEntry[]> {
  const d = await db();
  const all = await d.getAll('meta');
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getMapsetBytes(id: string): Promise<Uint8Array | undefined> {
  const d = await db();
  return (await d.get('files', id))?.bytes;
}

export async function deleteMapset(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['meta', 'files'], 'readwrite');
  await tx.objectStore('meta').delete(id);
  await tx.objectStore('files').delete(id);
  await tx.done;
}
