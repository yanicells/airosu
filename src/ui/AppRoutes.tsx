import { Route, Routes } from 'react-router';
import { App } from './App';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/leaderboard" element={<div className="screen-center">leaderboard — soon</div>} />
      <Route path="/u/:osuId" element={<div className="screen-center">profile — soon</div>} />
    </Routes>
  );
}
