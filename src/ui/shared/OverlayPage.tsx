import type { ReactNode } from 'react';
import { GameHeader } from './GameHeader';
import './overlay.css';

/**
 * osu!lazer overlay page (profile, rankings): toolbar, a centred panel with a cover banner,
 * and a header strip with an icon and lowercase title.
 */
export function OverlayPage({
  icon,
  title,
  cover,
  children,
}: {
  icon: ReactNode;
  title: string;
  /** image URL for the banner; falls back to a triangle gradient */
  cover?: string;
  children: ReactNode;
}) {
  return (
    <div className="lazer-shell overlay-scene">
      <GameHeader />
      <main className="overlay-panel">
        <div
          className="overlay-cover"
          style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
          aria-hidden="true"
        />
        <header className="overlay-header">
          <span className="overlay-header__icon">{icon}</span>
          <h1>{title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}
