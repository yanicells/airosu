import { Route, Routes } from 'react-router';
import { App } from './App';
import { NavBar } from './nav';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/leaderboard"
        element={
          <>
            <NavBar />
            <div className="screen-center">leaderboard — soon</div>
          </>
        }
      />
      <Route
        path="/u/:osuId"
        element={
          <>
            <NavBar />
            <div className="screen-center">profile — soon</div>
          </>
        }
      />
    </Routes>
  );
}
