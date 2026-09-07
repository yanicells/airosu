import { useState } from 'react';
import { Link } from 'react-router';
import { useAppState } from '../appState';
import { GameHeader } from '../shared/GameHeader';
import './menu.css';

export function HomeScreen() {
  const [open, setOpen] = useState(false);
  const { setScreen } = useAppState();
  return (
    <div className="lazer-shell home-scene">
      <GameHeader title="Welcome home" />
      <div className="home-triangles" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <main className={`home-center${open ? ' is-open' : ''}`}>
        <div className="home-kicker">A little rhythm. A little motion.</div>
        <div className="home-menu-band">
          <button className="home-disc" aria-label="Open main menu" aria-expanded={open}
            aria-controls="home-actions" onClick={() => setOpen((value) => !value)}>
            <span>airosu!</span><small>move to the music</small>
          </button>
          {open && <nav id="home-actions" className="home-actions" aria-label="Main menu">
            <button className="home-action home-action--play" onClick={() => setScreen('songs')}>
              <span>▷</span><strong>Play</strong><small>Find your next beat</small>
            </button>
            <button className="home-action home-action--settings" onClick={() => setScreen('settings')}>
              <span>⚙</span><strong>Settings</strong><small>Make it feel right</small>
            </button>
            <Link className="home-action home-action--rankings" to="/leaderboard">
              <span>♧</span><strong>Rankings</strong><small>See where you stand</small>
            </Link>
          </nav>}
        </div>
        <p className="home-hint">{open ? 'Your hands. Your rhythm.' : 'Click the circle to begin'}</p>
      </main>
      <footer className="home-footer"><span>WEBCAM RHYTHM GAME</span><span>Play osu! beatmaps with your hands</span><span>airosu! / standard</span></footer>
    </div>
  );
}
