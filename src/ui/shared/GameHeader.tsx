import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import { AppStateContext, type Screen } from '../appState';
import { AuthButton } from '../nav';
import { GearIcon, HomeIcon, TargetIcon, TrophyIcon, UserIcon } from './icons';

const sessionStart = Date.now();

/** Wall clock plus session runtime, like lazer's toolbar. Isolated so only it re-renders each second. */
function ToolbarClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const running = Math.floor((now - sessionStart) / 1000);
  const hms = [running / 3600, (running / 60) % 60, running % 60]
    .map((part) => String(Math.floor(part)).padStart(2, '0'))
    .join(':');
  return (
    <span className="toolbar-clock" aria-hidden="true">
      <strong>{new Date(now).toLocaleTimeString()}</strong>
      <small>running {hms}</small>
    </span>
  );
}

/** Thin osu!lazer-style toolbar shared by every non-gameplay screen and the web routes. */
export function GameHeader() {
  const app = useContext(AppStateContext);
  const navigate = useNavigate();
  const screen = app?.screen;
  // Web routes (profile, rankings) live outside the game; send them home with the wanted screen.
  const setScreen = (next: Screen) =>
    app ? app.setScreen(next) : navigate('/', { state: { screen: next } });
  const me = useQuery(api.users.me);
  const { signIn } = useAuthActions();
  return (
    <header className="game-header">
      <button
        className={`toolbar-button${screen === 'settings' ? ' is-active' : ''}`}
        onClick={() => (app && screen === 'settings' ? app.setScreen(app.settingsReturn) : setScreen('settings'))}
        aria-label="Settings"
      >
        <GearIcon />
      </button>
      <button
        className={`toolbar-button${screen === 'home' ? ' is-active' : ''}`}
        onClick={() => setScreen('home')}
        aria-label="Home"
      >
        <HomeIcon />
      </button>
      <span className="toolbar-mode" title="osu! standard">
        <TargetIcon size={20} />
      </span>
      <nav aria-label="Game navigation">
        <Link className="toolbar-button" to="/leaderboard" aria-label="Rankings">
          <TrophyIcon />
        </Link>
      </nav>
      {me && (
        <span className="header-pp">
          {Math.round(me.totalPp ?? 0).toLocaleString()} <small>pp</small>
        </span>
      )}
      {me === null ? (
        <button
          className="toolbar-button toolbar-guest"
          aria-label="Sign in with osu!"
          onClick={() => void signIn('osu')}
        >
          <span>Guest</span>
          <UserIcon size={30} />
        </button>
      ) : (
        <AuthButton />
      )}
      <ToolbarClock />
    </header>
  );
}
