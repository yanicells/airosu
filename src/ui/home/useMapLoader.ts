import { useCallback, useState } from 'react';
import { loadFromOsz, loadFromOsu, previewOsz } from '../../beatmap/load';
import type { StarterMap } from '../../beatmap/starterMaps';
import { useAppState } from '../appState';

export function useMapLoader(
  save: (bytes: Uint8Array, label: string, difficultyCount: number) => Promise<void>,
) {
  const { mapset, setMap, setMapset } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);

  const openMapset = useCallback(
    (bytes: Uint8Array, label: string) => {
      const preview = previewOsz(bytes);
      if (preview.difficulties.length === 0) throw new Error('No difficulties found in .osz');
      const pickedName = preview.difficulties[0].name;
      const loaded = loadFromOsz(bytes, pickedName);
      setMap(loaded);
      setMapset({ label, bytes, preview, pickedName });
      return preview.difficulties.length;
    },
    [setMap, setMapset],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (file.name.toLowerCase().endsWith('.osu')) {
          setMapset(undefined);
          setMap(loadFromOsu(new TextDecoder().decode(bytes), new ArrayBuffer(0)));
          return;
        }
        const label = file.name.replace(/\.osz$/i, '');
        const difficultyCount = openMapset(bytes, label);
        // fire-and-forget: persistence failures never block the upload
        void save(bytes, label, difficultyCount);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load map');
      }
    },
    [openMapset, setMap, setMapset, save],
  );

  const pickBundled = useCallback(
    async (m: StarterMap) => {
      setError(null);
      setBusyUrl(m.url);
      try {
        const bytes = new Uint8Array(await (await fetch(m.url)).arrayBuffer());
        openMapset(bytes, `${m.artist} — ${m.title}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load map');
      } finally {
        setBusyUrl(null);
      }
    },
    [openMapset],
  );

  const pickDifficulty = useCallback(
    (name: string) => {
      if (!mapset) return;
      try {
        setMap(loadFromOsz(mapset.bytes, name));
        setMapset({ ...mapset, pickedName: name });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse difficulty');
      }
    },
    [mapset, setMap, setMapset],
  );

  return { error, setError, busyUrl, openMapset, handleFile, pickBundled, pickDifficulty };
}
