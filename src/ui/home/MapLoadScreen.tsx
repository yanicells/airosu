import { useCallback, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { listDifficulties, loadFromOsz, loadFromOsu } from '../../beatmap/load';
import type { OszEntry } from '../../beatmap/load';
import { useAppState } from '../appState';
import { DifficultyPicker } from './DifficultyPicker';

export function MapLoadScreen() {
  const { map, settings, setSettings, setMap, setScreen } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [oszBytes, setOszBytes] = useState<Uint8Array | null>(null);
  const [difficulties, setDifficulties] = useState<OszEntry[]>([]);

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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 32,
        height: '100%',
        justifyContent: 'center',
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <h1 style={{ margin: 0 }}>airosu</h1>
      <p style={{ margin: 0, opacity: 0.7 }}>Play osu! beatmaps with your hand.</p>
      <label
        style={{
          border: '2px dashed #666',
          borderRadius: 12,
          padding: '32px 48px',
          cursor: 'pointer',
        }}
      >
        Drop a .osz / .osu file here or click to browse
        <input type="file" accept=".osz,.osu" style={{ display: 'none' }} onChange={onChange} />
      </label>
      {error && <p style={{ color: '#f66' }}>{error}</p>}
      {difficulties.length > 0 && !map && (
        <DifficultyPicker difficulties={difficulties} onPick={pickDifficulty} />
      )}
      {map && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 4 }}>
            {map.meta.artist} — {map.meta.title}
          </h2>
          <p style={{ marginTop: 0, opacity: 0.7 }}>[{map.meta.version}]</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
            <label>
              Mode:{' '}
              <select
                value={settings.inputMode}
                onChange={(e) =>
                  setSettings({ ...settings, inputMode: e.target.value as 'relax' | 'manual' })
                }
              >
                <option value="relax">Relax (auto-tap)</option>
                <option value="manual">Manual (Z/X to tap)</option>
              </select>
            </label>
            <label>
              Visuals:{' '}
              <select
                value={settings.visualMode}
                onChange={(e) =>
                  setSettings({ ...settings, visualMode: e.target.value as 'arcade' | 'focus' })
                }
              >
                <option value="arcade">Arcade (camera bg)</option>
                <option value="focus">Focus (dark bg)</option>
              </select>
            </label>
          </div>
          <button
            style={{ fontSize: 20, padding: '12px 48px', cursor: 'pointer' }}
            onClick={() => setScreen('calibrate')}
          >
            Play
          </button>
        </div>
      )}
      <button
        style={{ position: 'absolute', top: 16, right: 16, cursor: 'pointer' }}
        onClick={() => setScreen('settings')}
      >
        Settings
      </button>
    </div>
  );
}
