import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAppState } from '../appState';
import { AuthButton } from '../nav';

export function GameHeader({ title }: { title: string }) {
  const { setScreen } = useAppState();
  const me = useQuery(api.users.me);
  return (
    <header className="game-header">
      <button className="header-home" onClick={() => setScreen('home')} aria-label="Home">⌂</button>
      <span className="header-divider" />
      <button className="header-wordmark" onClick={() => setScreen('songs')}>airosu!</button>
      <span className="header-section">{title}</span>
      <nav aria-label="Game navigation">
        <button onClick={() => setScreen('settings')}>Settings</button>
        <Link to="/leaderboard">Rankings</Link>
      </nav>
      {me && <span className="header-pp">{Math.round(me.totalPp ?? 0).toLocaleString()} <small>pp</small></span>}
      <AuthButton />
    </header>
  );
}
