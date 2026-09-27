import { useState } from 'react';
import { useAppState } from '../appState';
import { GameHeader } from '../shared/GameHeader';
import { AirosuLogo } from './AirosuLogo';
import { MainMenuButtons } from './MainMenuButtons';
import './menu.css';

/** osu!lazer main menu: a lone logo that slides left and reveals the button band when clicked. */
export function HomeScreen() {
  const [open, setOpen] = useState(false);
  const { setScreen } = useAppState();
  return (
    <div
      className="lazer-shell home-scene"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <GameHeader />
      <div className="home-triangles" aria-hidden="true" />
      <main className={`home-stage${open ? ' is-open' : ''}`}>
        <div className="home-band" aria-hidden="true" />
        {open && <MainMenuButtons onPlay={() => setScreen('songs')} onSettings={() => setScreen('settings')} />}
        <AirosuLogo
          className="home-logo"
          aria-label={open ? 'Play' : 'Open main menu'}
          aria-expanded={open}
          aria-controls="home-actions"
          onClick={() => {
            if (open) return setScreen('songs');
            setOpen(true);
            void import('../home'); // warm the song select chunk while the menu animates in
          }}
        />
      </main>
      <aside className="home-news">
        <span>webcam rhythm game</span>
        <strong>play osu! beatmaps with your hands</strong>
      </aside>
    </div>
  );
}
