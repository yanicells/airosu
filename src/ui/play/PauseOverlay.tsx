import type { CSSProperties } from 'react';
import './pause.css';

interface MenuButton {
  label: string;
  color: string;
  onClick: () => void;
}

/** osu!lazer gameplay menu: spaced title, tagline, and full-width slanted action bars. */
export function GameplayMenu({
  title,
  tone = 'pause',
  description,
  buttons,
  retries,
  onEscape,
}: {
  title: string;
  tone?: 'pause' | 'fail';
  description: string;
  buttons: MenuButton[];
  retries?: number;
  onEscape?: () => void;
}) {
  return (
    <div
      className={`gameplay-menu gameplay-menu--${tone}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameplay-menu-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onEscape) {
          event.stopPropagation();
          onEscape();
          return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('.gameplay-menu__button')];
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        items[(current + step + items.length) % items.length]?.focus();
      }}
    >
      <header>
        <h2 id="gameplay-menu-title">{title}</h2>
        <p>{description}</p>
      </header>
      <div className="gameplay-menu__buttons">
        {buttons.map((button, index) => (
          <button
            key={button.label}
            className="gameplay-menu__button"
            style={{ '--button-color': button.color } as CSSProperties}
            autoFocus={index === 0}
            onClick={button.onClick}
          >
            <span>{button.label}</span>
          </button>
        ))}
      </div>
      {retries !== undefined && (
        <p className="gameplay-menu__retries">
          You've retried <strong>{retries} {retries === 1 ? 'time' : 'times'}</strong> in this session
        </p>
      )}
    </div>
  );
}

export function PauseOverlay({
  retries,
  onResume,
  onRestart,
  onQuit,
}: {
  retries: number;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    <GameplayMenu
      title="paused"
      description="you're not going to do what i think you're going to do, are ya?"
      retries={retries}
      onEscape={onResume}
      buttons={[
        { label: 'Continue', color: '#88b300', onClick: onResume },
        { label: 'Retry', color: '#eeaa00', onClick: onRestart },
        { label: 'Quit', color: '#aa1b27', onClick: onQuit },
      ]}
    />
  );
}
