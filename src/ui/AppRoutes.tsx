import { Route, Routes } from 'react-router';
import { App } from './App';
import { LeaderboardPage } from './leaderboard';
import { ProfilePage } from './profile';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/u/:osuId" element={<ProfilePage />} />
    </Routes>
  );
}
