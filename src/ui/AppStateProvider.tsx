import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoadedBeatmap } from '../beatmap/model';
import type { CalibrationBox } from '../cv/calibration';
import { AppStateContext, loadSettings, saveSettings } from './appState';
import type { AppState, LastResult, Mapset, Screen, Settings } from './appState';

/**
 * Owns game state above the router so the picked map, calibration and last result survive
 * a detour through the web routes (/leaderboard, /u/:id) and the browser's Back button.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('home');
  // Settings slides over whatever screen opened it, so closing it returns there.
  const [settingsReturn, setSettingsReturn] = useState<Screen>('home');
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const go = useCallback((next: Screen) => {
    if (next === 'settings' && screenRef.current !== 'settings') setSettingsReturn(screenRef.current);
    setScreen(next);
  }, []);
  const [map, setMap] = useState<LoadedBeatmap | undefined>();
  const [mapset, setMapset] = useState<Mapset | undefined>();
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [calibration, setCalibration] = useState<CalibrationBox | undefined>();
  const [lastResult, setLastResult] = useState<LastResult | undefined>();

  const state = useMemo<AppState>(
    () => ({
      screen,
      map,
      mapset,
      settings,
      calibration,
      lastResult,
      settingsReturn,
      setScreen: go,
      setMap,
      setMapset,
      setSettings(s: Settings) {
        setSettingsState(s);
        saveSettings(s);
      },
      setCalibration,
      setLastResult,
    }),
    [screen, settingsReturn, go, map, mapset, settings, calibration, lastResult],
  );

  return <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>;
}
