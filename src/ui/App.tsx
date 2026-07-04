import { useMemo, useState } from 'react';
import type { LoadedBeatmap } from '../beatmap/model';
import type { CalibrationBox } from '../cv/calibration';
import { AppStateContext, loadSettings, saveSettings } from './appState';
import type { AppState, LastResult, Screen, Settings } from './appState';
import { MapLoadScreen } from './home';

function StubScreen({ name }: { name: string }) {
  return <div style={{ padding: 32 }}>{name} (coming soon)</div>;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [map, setMap] = useState<LoadedBeatmap | undefined>();
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [calibration, setCalibration] = useState<CalibrationBox | undefined>();
  const [lastResult, setLastResult] = useState<LastResult | undefined>();

  const state = useMemo<AppState>(
    () => ({
      screen,
      map,
      settings,
      calibration,
      lastResult,
      setScreen,
      setMap,
      setSettings(s: Settings) {
        setSettingsState(s);
        saveSettings(s);
      },
      setCalibration,
      setLastResult,
    }),
    [screen, map, settings, calibration, lastResult],
  );

  return (
    <AppStateContext.Provider value={state}>
      {screen === 'home' && <MapLoadScreen />}
      {screen === 'calibrate' && <StubScreen name="Calibration" />}
      {screen === 'play' && <StubScreen name="Play" />}
      {screen === 'results' && <StubScreen name="Results" />}
      {screen === 'settings' && <StubScreen name="Settings" />}
    </AppStateContext.Provider>
  );
}
