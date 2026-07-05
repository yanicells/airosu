import { useCallback, useEffect, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { listDifficulties, loadFromOsz, loadFromOsu, previewOsz } from '../../beatmap/load';
import type { MapsetPreview } from '../../beatmap/load';
import type { BundledMap } from '../../beatmap/bundled';
import { useAppState } from '../appState';
import { DifficultyPicker } from './DifficultyPicker';
import { MapCard } from './MapCard';
import { SongList } from './SongList';

interface Mapset {
  label: string;
  bytes: Uint8Array;
  preview: MapsetPreview;
  bgUrl?: string;
  pickedName?: string;
}

export function MapLoadScreen() {
  const { map, settings, setSettings, setMap, setScreen } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [mapset, setMapset] = useState<Mapset | null>(null);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (mapset?.bgUrl) URL.revokeObjectURL(mapset.bgUrl);
    },
    [mapset?.bgUrl],
  );

  const openMapset = useCallback(
    (bytes: Uint8Array, label: string) => {
      if (listDifficulties(bytes).length === 0) throw new Error('No difficulties found in .osz');
      const preview = previewOsz(bytes);
      setMap(undefined);
      setMapset({
        label,
        bytes,
        preview,
        bgUrl: preview.background ? URL.createObjectURL(preview.background) : undefined,
      });
    },
    [setMap],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (file.name.toLowerCase().endsWith('.osu')) {
          setMapset(null);
          setMap(loadFromOsu(new TextDecoder().decode(bytes), new ArrayBuffer(0)));
          return;
        }
        openMapset(bytes, file.name.replace(/\.osz$/i, ''));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load map');
      }
    },
    [openMapset, setMap],
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

  const backToList = useCallback(() => {
    setMapset(null);
    setMap(undefined);
    setError(null);
  }, [setMap]);

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
      {mapset?.bgUrl && <div className="bg-blur" style={{ backgroundImage: `url(${mapset.bgUrl})` }} />}

      {!mapset && (
        <>
          <h1 style={{ margin: 0, fontSize: 48 }}>
            airosu<span style={{ color: 'var(--pink)' }}>!</span>
          </h1>
          <p className="eyebrow" style={{ margin: 0 }}>
            Play osu! beatmaps with your hand
          </p>
          <SongList onPick={(m) => void pickBundled(m)} busyUrl={busyUrl} />
          <label className="panel" style={{ padding: '14px 32px', cursor: 'pointer', borderStyle: 'dashed' }}>
            …or drop your own .osz / .osu file
            <input type="file" accept=".osz,.osu" style={{ display: 'none' }} onChange={onChange} />
          </label>
        </>
      )}

      {mapset && (
        <>
          <button className="btn" style={{ position: 'absolute', top: 16, left: 16 }} onClick={backToList}>
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
          bgUrl={mapset?.bgUrl}
          settings={settings}
          setSettings={setSettings}
          onPlay={() => setScreen('calibrate')}
        />
      )}

      <button
        className="btn"
        style={{ position: 'absolute', top: 16, right: 16 }}
        onClick={() => setScreen('settings')}
      >
        Settings
      </button>
    </div>
  );
}
