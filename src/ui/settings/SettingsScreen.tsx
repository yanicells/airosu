import { useRef, useState } from 'react';
import { useAppState } from '../appState';
import { GameHeader } from '../shared/GameHeader';
import { SearchIcon } from '../shared/icons';
import { SettingsQuery } from './rows';
import { SECTIONS, SettingsSections } from './SettingsSections';
import '../shared/lazerPanel.css';
import './settings.css';

/** osu!lazer settings: section rail, searchable panel, and a dimmed area that closes it. */
export function SettingsScreen() {
  const { settingsReturn, setScreen } = useAppState();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setScreen(settingsReturn);

  const jump = (id: string) => {
    const panel = panelRef.current;
    const section = panel?.querySelector<HTMLElement>(`#settings-${id}`);
    if (!panel || !section) return;
    setActive(id);
    panel.scrollTo({ top: section.offsetTop - 16, behavior: 'smooth' });
  };

  return (
    <div
      className="lazer-shell settings-scene"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) close();
      }}
    >
      <GameHeader />
      <div className="settings-body">
        <nav className="settings-rail" aria-label="Settings sections">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              className={active === section.id ? 'is-active' : ''}
              aria-current={active === section.id}
              onClick={() => jump(section.id)}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
        <div
          ref={panelRef}
          className="lz-panel settings-panel"
          onScroll={(event) => {
            const top = event.currentTarget.scrollTop + 80;
            const current = [...event.currentTarget.querySelectorAll<HTMLElement>('.settings-section')]
              .filter((section) => section.offsetTop <= top)
              .at(-1);
            if (current) setActive(current.id.replace('settings-', ''));
          }}
        >
          <header className="lz-panel__title">
            <h1>settings</h1>
            <p>change the way airosu! behaves</p>
          </header>
          <label className="lz-search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="type to search"
              aria-label="Search settings"
              autoFocus
            />
            <SearchIcon size={24} />
          </label>
          <SettingsQuery.Provider value={query}>
            <SettingsSections />
          </SettingsQuery.Provider>
          <p className="settings-empty">No settings match “{query}”.</p>
        </div>
        <button className="settings-dim" aria-label="Close settings" onClick={close} />
      </div>
    </div>
  );
}
