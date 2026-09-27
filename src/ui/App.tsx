import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import type { LoadedBeatmap } from '../beatmap/model';
import { stopCvSession } from '../cv/cvSession';
import type { CalibrationBox } from '../cv/calibration';
import { AppStateContext, loadSettings, saveSettings } from './appState';
import type { AppState, LastResult, Mapset, Screen, Settings } from './appState';
import { HomeScreen } from './menu';
import './shared/lazer.css';

// Only the main menu ships in the entry chunk; the menu prefetches song select when it opens.
const MapLoadScreen = lazy(() => import('./home').then((m) => ({ default: m.MapLoadScreen })));
const CalibrationScreen = lazy(() => import('./calibrate').then((m) => ({ default: m.CalibrationScreen })));
const PlayScreen = lazy(() => import('./play').then((m) => ({ default: m.PlayScreen })));
const ResultsScreen = lazy(() => import('./results').then((m) => ({ default: m.ResultsScreen })));
const SettingsScreen = lazy(() => import('./settings').then((m) => ({ default: m.SettingsScreen })));

export function App() {
  const location = useLocation();
  // The toolbar on web routes can ask for settings via navigation state.
  const [screen, setScreen] = useState<Screen>(() =>
    (location.state as { screen?: Screen } | null)?.screen === 'settings' ? 'settings' : 'home',
  );
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

  useEffect(() => {
    if (screen === 'home' || screen === 'songs' || screen === 'settings') stopCvSession();
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

  return (
    <AppStateContext.Provider value={state}>
      {screen === 'home' && <HomeScreen />}
      <Suspense fallback={<div className="screen-center">Loading…</div>}>
        {screen === 'songs' && <MapLoadScreen />}
        {screen === 'calibrate' && <CalibrationScreen />}
        {screen === 'play' && <PlayScreen />}
        {screen === 'results' && <ResultsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </Suspense>
    </AppStateContext.Provider>
  );
}
