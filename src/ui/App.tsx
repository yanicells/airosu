import { lazy, Suspense, useEffect } from 'react';
import { peekCvSession, stopCvSession } from '../cv/cvSession';
import { useAppState } from './appState';
import { HomeScreen } from './menu';
import './shared/lazer.css';

// Only the main menu ships in the entry chunk; the menu prefetches song select when it opens.
const MapLoadScreen = lazy(() => import('./home').then((m) => ({ default: m.MapLoadScreen })));
const CalibrationScreen = lazy(() => import('./calibrate').then((m) => ({ default: m.CalibrationScreen })));
const PlayScreen = lazy(() => import('./play').then((m) => ({ default: m.PlayScreen })));
const ResultsScreen = lazy(() => import('./results').then((m) => ({ default: m.ResultsScreen })));
const SettingsScreen = lazy(() => import('./settings').then((m) => ({ default: m.SettingsScreen })));

export function App() {
  const { screen, settingsReturn, setScreen } = useAppState();
  // Gameplay needs a live camera. It is gone after a detour through the web routes, so play
  // (including Retry from results) goes back through calibration instead.
  const cameraMissing = screen === 'play' && !peekCvSession();
  // Settings opened from calibration keeps calibration mounted (hidden) so an unsaved aim
  // area and the current step survive the round trip.
  const calibrationMounted =
    screen === 'calibrate' || (screen === 'settings' && settingsReturn === 'calibrate');

  useEffect(() => {
    // Settings may return to calibrate/results, so only leaving the game flow stops the camera.
    if (screen === 'home' || screen === 'songs') stopCvSession();
    if (cameraMissing) setScreen('calibrate');
  }, [screen, cameraMissing, setScreen]);
  useEffect(() => stopCvSession, []);

  return (
    <>
      {screen === 'home' && <HomeScreen />}
      <Suspense fallback={<div className="screen-center">Loading…</div>}>
        {screen === 'songs' && <MapLoadScreen />}
        {calibrationMounted && (
          <div
            hidden={screen !== 'calibrate'}
            style={screen === 'calibrate' ? { display: 'contents' } : undefined}
          >
            <CalibrationScreen />
          </div>
        )}
        {screen === 'play' && !cameraMissing && <PlayScreen />}
        {screen === 'results' && <ResultsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </Suspense>
    </>
  );
}
