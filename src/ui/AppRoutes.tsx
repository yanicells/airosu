import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { App } from './App';

// Web routes load on demand so the game's entry chunk stays small.
const LeaderboardPage = lazy(() => import('./leaderboard').then((m) => ({ default: m.LeaderboardPage })));
const ProfilePage = lazy(() => import('./profile').then((m) => ({ default: m.ProfilePage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="screen-center">Loading…</div>}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/u/:osuId" element={<ProfilePage />} />
      </Routes>
    </Suspense>
  );
}
