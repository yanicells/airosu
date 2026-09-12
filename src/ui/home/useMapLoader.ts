import { useCallback, useEffect, useRef, useState } from 'react';
import { openMapArchive, loadMapDifficulty, loadStandaloneMap } from '../../beatmap/mapWorker';
import { starterBytes } from '../../beatmap/starterBytes';
import type { StarterMap } from '../../beatmap/starterMaps';
import { useAppState } from '../appState';

export function useMapLoader(
  save: (bytes: Uint8Array, label: string, difficultyCount: number) => Promise<void>,
) {
  const { mapset, setMap, setMapset } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);
  useEffect(() => () => { latest.current++; }, []);

  const run = useCallback(async (work: (id: number) => Promise<void>, url?: string) => {
    const id = ++latest.current;
    setError(null);
    setBusy(true);
    setBusyUrl(url ?? null);
    try {
      await work(id);
    } catch (e) {
      if (id === latest.current) setError(e instanceof Error ? e.message : 'Failed to load map');
    } finally {
      if (id === latest.current) {
        setBusy(false);
        setBusyUrl(null);
      }
    }
  }, []);

  const loadArchive = useCallback(async (bytes: Uint8Array, label: string, id: number, sourceUrl?: string) => {
    const { preview, map } = await openMapArchive(bytes);
    if (id !== latest.current) return;
    setMap(map);
    setMapset({ label, bytes, preview, pickedName: map.meta.version, sourceUrl });
    return preview.difficulties.length;
  }, [setMap, setMapset]);

  const openMapset = useCallback((bytes: Uint8Array, label: string) =>
    run(async (id) => { await loadArchive(bytes, label, id); }), [run, loadArchive]);

  const handleFile = useCallback((file: File) => run(async (id) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (id !== latest.current) return;
    if (file.name.toLowerCase().endsWith('.osu')) {
      const map = await loadStandaloneMap(new TextDecoder().decode(bytes));
      if (id !== latest.current) return;
      setMapset(undefined);
      setMap(map);
      return;
    }
    const label = file.name.replace(/\.osz$/i, '');
    const count = await loadArchive(bytes, label, id);
    if (count !== undefined) void save(bytes, label, count);
  }), [run, loadArchive, setMap, setMapset, save]);

  const pickBundled = useCallback((m: StarterMap) => run(async (id) => {
    const bytes = await starterBytes(m.url);
    if (id === latest.current) await loadArchive(bytes, `${m.artist} — ${m.title}`, id, m.url);
  }, m.url), [run, loadArchive]);

  const pickDifficulty = useCallback((name: string) => {
    if (!mapset || (name === mapset.pickedName && !busy)) return;
    return run(async (id) => {
      const loaded = await loadMapDifficulty(mapset.bytes, name);
      if (id !== latest.current) return;
      setMap(loaded);
      setMapset({ ...mapset, pickedName: name });
    });
  }, [mapset, busy, run, setMap, setMapset]);

  return { error, busy, busyUrl, openMapset, handleFile, pickBundled, pickDifficulty };
}
