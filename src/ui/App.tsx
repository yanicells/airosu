import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { LoadedBeatmap } from '../beatmap/model';
import { stopCvSession } from '../cv/cvSession';
import type { CalibrationBox } from '../cv/calibration';
import { AppStateContext, loadSettings, saveSettings } from './appState';
import type { AppState, LastResult, Mapset, Screen, Settings } from './appState';
import { MapLoadScreen } from './home';
const CalibrationScreen = lazy(() => import('./calibrate').then((m) => ({ default: m.CalibrationScreen })));
const PlayScreen = lazy(() => import('./play').then((m) => ({ default: m.PlayScreen })));
import { ResultsScreen } from './results';
import { SettingsScreen } from './settings';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [map, setMap] = useState<LoadedBeatmap | undefined>();
  const [mapset, setMapset] = useState<Mapset | undefined>();
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [calibration, setCalibration] = useState<CalibrationBox | undefined>();
  const [lastResult, setLastResult] = useState<LastResult | undefined>();

  useEffect(() => {
    if (screen === 'home' || screen === 'settings') stopCvSession();
  }, [screen]);
  useEffect(() => stopCvSession, []);

  const state = useMemo<AppState>(
    () => ({
      screen,
      map,
      mapset,
      settings,
      calibration,
      lastResult,
      setScreen,
      setMap,
      setMapset,
      setSettings(s: Settings) {
        setSettingsState(s);
        saveSettings(s);
      },
      setCalibration,
      setLastResult,
    }),
    [screen, map, mapset, settings, calibration, lastResult],
  );

  return (
    <AppStateContext.Provider value={state}>
      {screen === 'home' && <MapLoadScreen />}
      <Suspense fallback={<div className="screen-center">Loading…</div>}>
        {screen === 'calibrate' && <CalibrationScreen />}
        {screen === 'play' && <PlayScreen />}
      </Suspense>
      {screen === 'results' && <ResultsScreen />}
      {screen === 'settings' && <SettingsScreen />}
    </AppStateContext.Provider>
  );
}
