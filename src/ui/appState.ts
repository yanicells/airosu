import { createContext, useContext } from 'react';
import type { MapsetPreview } from '../beatmap/load';
import type { LoadedBeatmap } from '../beatmap/model';
import type { CalibrationBox } from '../cv/calibration';
import type { CursorAnchor } from '../cv/cursorPoint';

/** A parsed .osz the player is browsing; survives screen changes. */
export interface Mapset {
  label: string;
  bytes: Uint8Array;
  preview: MapsetPreview;
  pickedName?: string;
}

export type Screen = 'home' | 'calibrate' | 'play' | 'results' | 'settings';

export interface Settings {
  /** 0.5–2, default 1 (scales calibration box) */
  sensitivity: number;
  /** 0–1, default 0.5 (maps to One Euro minCutoff) */
  smoothing: number;
  /** hit window+radius multiplier, default 1.5 */
  forgiveness: number;
  audioOffsetMs: number;
  mirror: boolean;
  visualMode: 'arcade' | 'focus';
  inputMode: 'relax' | 'manual';
  /** 0–1, default 0.8 */
  volume: number;
  /** manual-mode tap keys */
  tapKeys: string[];
  /** which hand landmark drives the cursor */
  cursorAnchor: CursorAnchor;
}

export const defaultSettings: Settings = {
  sensitivity: 1,
  smoothing: 0.5,
  forgiveness: 1.5,
  audioOffsetMs: 0,
  mirror: true,
  visualMode: 'arcade',
  inputMode: 'relax',
  volume: 0.8,
  tapKeys: ['z', 'x', ' '],
  cursorAnchor: 'palm',
};

export interface LastResult {
  score: number;
  maxCombo: number;
  accuracy: number;
  /** performance points (nomod approximation) */
  pp: number;
  counts: { 300: number; 100: number; 50: number; 0: number };
  /** idempotency key for online submission; one per completed play */
  playId: string;
  inputMode: 'relax' | 'manual';
  forgiveness: number;
  cursorAnchor: CursorAnchor;
}

export interface AppState {
  screen: Screen;
  map?: LoadedBeatmap;
  mapset?: Mapset;
  settings: Settings;
  calibration?: CalibrationBox;
  lastResult?: LastResult;
  setScreen(screen: Screen): void;
  setMap(map: LoadedBeatmap | undefined): void;
  setMapset(mapset: Mapset | undefined): void;
  setSettings(settings: Settings): void;
  setCalibration(box: CalibrationBox): void;
  setLastResult(result: LastResult): void;
}

export const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) throw new Error('useAppState outside provider');
  return state;
}

const STORAGE_KEY = 'airosu.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable — settings stay in-memory
  }
}
