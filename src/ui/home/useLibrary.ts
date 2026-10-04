import { useCallback, useEffect, useState } from 'react';
import {
  deleteMapset,
  getMapsetBytes,
  listMapsets,
  saveMapset,
  type LibraryEntry,
} from '../../beatmap/library';

/**
 * Persistent "your maps" library. Every method degrades gracefully: storage
 * failures (quota, private browsing) set `unavailable` and leave the session
 * working in-memory, exactly like before the library existed.
 */
export function useLibrary() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    setEntries(await listMapsets());
  }, []);

  useEffect(() => {
    refresh().catch(() => setUnavailable(true));
  }, [refresh]);

  /** Resolves to the saved entry's id, or undefined when storage is unavailable. */
  const save = useCallback(
    async (bytes: Uint8Array, label: string, difficultyCount: number) => {
      try {
        const { id } = await saveMapset(bytes, label, difficultyCount);
        await refresh();
        return id;
      } catch {
        setUnavailable(true); // upload continues in-memory
        return undefined;
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteMapset(id);
        await refresh();
      } catch {
        setUnavailable(true);
      }
    },
    [refresh],
  );

  const open = useCallback(async (id: string) => {
    try {
      return await getMapsetBytes(id);
    } catch {
      setUnavailable(true);
      return undefined;
    }
  }, []);

  return { entries, save, remove, open, unavailable };
}
