import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { listDifficulties, loadFromOsz, loadFromOsu, previewOsz } from '../../beatmap/load';
import { bundledMaps } from '../../beatmap/bundled';
import type { BundledMap } from '../../beatmap/bundled';
import { useAppState } from '../appState';
import { useObjectUrl } from '../useObjectUrl';
import { AuthButton } from '../nav';
import { DifficultyPicker } from './DifficultyPicker';
import { MapCard } from './MapCard';
import { SongList } from './SongList';
import { YourMaps } from './YourMaps';
import { useLibrary } from './useLibrary';
import { useSongBackground } from './useSongBackground';

export function MapLoadScreen() {
  const { map, mapset, settings, setSettings, setMap, setMapset, setScreen } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  const library = useLibrary();

  const bgUrl = useObjectUrl(mapset?.preview.background);

  // song list: a random map starts selected, arrow keys move, Enter opens
  const maps = useMemo(bundledMaps, []);
  const [selectedIdx, setSelectedIdx] = useState(() =>
    maps.length ? Math.floor(Math.random() * maps.length) : 0,
  );
  const onSongList = !mapset && !map;
  const selected = onSongList && maps.length ? maps[selectedIdx] : undefined;
  const previewBgUrl = useObjectUrl(useSongBackground(selected));

  const openMapset = useCallback(
    (bytes: Uint8Array, label: string) => {
      if (listDifficulties(bytes).length === 0) throw new Error('No difficulties found in .osz');
      setMap(undefined);
      setMapset({ label, bytes, preview: previewOsz(bytes) });
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
        openMapset(bytes, label);
        // fire-and-forget: persistence failures never block the upload
        void library.save(bytes, label, listDifficulties(bytes).length);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load map');
      }
    },
    [openMapset, setMap, setMapset, library],
  );

  const pickBundled = useCallback(
    async (m: BundledMap) => {
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
    [mapset, setMap],
  );

  useEffect(() => {
    if (!onSongList || maps.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (busyUrl) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setSelectedIdx((i) => (i + step + maps.length) % maps.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void pickBundled(maps[selectedIdx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSongList, maps, busyUrl, selectedIdx, pickBundled]);

  const backToList = useCallback(() => {
    setMapset(undefined);
    setMap(undefined);
    setError(null);
  }, [setMap, setMapset]);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      className="screen-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={{ gap: 18 }}
    >
      {(onSongList ? previewBgUrl : bgUrl) && (
        <div
          className="bg-blur"
          style={{ backgroundImage: `url(${onSongList ? previewBgUrl : bgUrl})` }}
        />
      )}

      {!mapset && (
        <>
          <h1 style={{ margin: 0, fontSize: 48 }}>
            airosu<span style={{ color: 'var(--pink)' }}>!</span>
          </h1>
          <p className="eyebrow" style={{ margin: 0 }}>
            Play osu! beatmaps with your hand
          </p>
          <SongList
            maps={maps}
            onPick={(m) => void pickBundled(m)}
            busyUrl={busyUrl}
            selectedUrl={selected?.url}
          />
          <label className="panel" style={{ padding: '14px 32px', cursor: 'pointer', borderStyle: 'dashed' }}>
            {maps.length === 0 ? 'Drop your own .osz / .osu file to play' : '…or drop your own .osz / .osu file'}
            <input type="file" accept=".osz,.osu" style={{ display: 'none' }} onChange={onChange} />
          </label>
          <YourMaps
            library={library}
            onOpen={(bytes, label) => {
              try {
                openMapset(bytes, label);
                setError(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load map');
              }
            }}
          />
        </>
      )}

      {mapset && (
        <>
          <button
            className="btn btn--back"
            style={{ position: 'absolute', top: 16, left: 16 }}
            onClick={backToList}
          >
            ‹ Songs
          </button>
          <h2 style={{ margin: 0, fontSize: 30, textAlign: 'center' }}>{mapset.label}</h2>
          <DifficultyPicker
            difficulties={mapset.preview.difficulties}
            active={mapset.pickedName}
            onPick={pickDifficulty}
          />
        </>
      )}

      {error && <p style={{ color: '#ff6b81', margin: 0 }}>{error}</p>}

      {map && (
        <MapCard
          map={map}
          bgUrl={bgUrl}
          settings={settings}
          setSettings={setSettings}
          onPlay={() => setScreen('calibrate')}
        />
      )}

      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <AuthButton />
        <button className="btn" onClick={() => setScreen('settings')}>
          Settings
        </button>
      </div>
    </div>
  );
}
