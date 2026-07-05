import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { listDifficulties, loadFromOsz, loadFromOsu } from '../../beatmap/load';
import type { OszEntry } from '../../beatmap/load';
import { useAppState } from '../appState';
import { DifficultyPicker } from './DifficultyPicker';
import { MapCard } from './MapCard';

export function MapLoadScreen() {
  const { map, settings, setSettings, setMap, setScreen } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [oszBytes, setOszBytes] = useState<Uint8Array | null>(null);
  const [difficulties, setDifficulties] = useState<OszEntry[]>([]);

  const bgUrl = useMemo(
    () => (map?.background ? URL.createObjectURL(map.background) : undefined),
    [map?.background],
  );
  useEffect(
    () => () => {
      if (bgUrl) URL.revokeObjectURL(bgUrl);
    },
    [bgUrl],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (file.name.toLowerCase().endsWith('.osu')) {
          setMap(loadFromOsu(new TextDecoder().decode(bytes), new ArrayBuffer(0)));
          setDifficulties([]);
          return;
        }
        const diffs = listDifficulties(bytes);
        if (diffs.length === 0) throw new Error('No difficulties found in .osz');
        setOszBytes(bytes);
        setDifficulties(diffs);
        setMap(undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load map');
      }
    },
    [setMap],
  );

  const pickDifficulty = useCallback(
    (name: string) => {
      if (!oszBytes) return;
      try {
        setMap(loadFromOsz(oszBytes, name));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse difficulty');
      }
    },
    [oszBytes, setMap],
  );

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
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        padding: 32,
        height: '100%',
        justifyContent: 'center',
        overflow: 'hidden auto',
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {bgUrl && (
        <div
          style={{
            position: 'absolute',
            inset: -32,
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(24px) brightness(0.35)',
            zIndex: -1,
          }}
        />
      )}
      <h1 style={{ margin: 0, fontSize: 48 }}>
        airosu<span style={{ color: 'var(--pink)' }}>!</span>
      </h1>
      <p className="eyebrow" style={{ margin: 0 }}>
        Play osu! beatmaps with your hand
      </p>
      <label
        className="panel"
        style={{ padding: '22px 44px', cursor: 'pointer', borderStyle: 'dashed' }}
      >
        Drop a .osz / .osu file here or click to browse
        <input type="file" accept=".osz,.osu" style={{ display: 'none' }} onChange={onChange} />
      </label>
      {error && <p style={{ color: '#ff6b81', margin: 0 }}>{error}</p>}
      {difficulties.length > 0 && !map && (
        <DifficultyPicker difficulties={difficulties} onPick={pickDifficulty} />
      )}
      {map && (
        <MapCard
          map={map}
          bgUrl={bgUrl}
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
