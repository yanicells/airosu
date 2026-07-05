import { useMemo, useState } from 'react';
import type { LoadedBeatmap } from '../beatmap/model';
import type { CalibrationBox } from '../cv/calibration';
import { AppStateContext, loadSettings, saveSettings } from './appState';
import type { AppState, LastResult, Mapset, Screen, Settings } from './appState';
import { MapLoadScreen } from './home';
import { CalibrationScreen } from './calibrate';
import { PlayScreen } from './play';
import { ResultsScreen } from './results';
import { SettingsScreen } from './settings';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
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
      {screen === 'calibrate' && <CalibrationScreen />}
      {screen === 'play' && <PlayScreen />}
      {screen === 'results' && <ResultsScreen />}
      {screen === 'settings' && <SettingsScreen />}
    </AppStateContext.Provider>
  );
}
