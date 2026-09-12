import { useState } from 'react';
import { starterMaps } from '../../beatmap/starterMaps';
import { useAppState } from '../appState';
import { useObjectUrl } from '../useObjectUrl';
import { GameHeader } from '../shared/GameHeader';
import { SongDetails } from './SongDetails';
import { SongList } from './SongList';
import { YourMaps } from './YourMaps';
import { useLibrary } from './useLibrary';
import { useMapLoader } from './useMapLoader';
import { SongDifficulties } from './SongDifficulties';
import './songSelect.css';

export function MapLoadScreen() {
  const { map, mapset, setScreen } = useAppState();
  const library = useLibrary();
  const loader = useMapLoader(library.save);
  const maps = starterMaps;
  const [search, setSearch] = useState('');
  const bgUrl = useObjectUrl(mapset?.preview.background ?? map?.background);
  const visible = maps.filter((song) =>
    `${song.title} ${song.artist}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div
      className="lazer-shell song-select"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) {
          void loader.handleFile(file);
        }
      }}
    >
      {bgUrl && <div className="song-backdrop" style={{ backgroundImage: `url("${bgUrl}")` }} />}
      <GameHeader title="Song select" />
      <main className="song-select-grid">
        <div className="song-left">
          <SongDetails />
        </div>
        <aside className="song-right" aria-label="Song selection">
          <div className="song-search">
            <label htmlFor="song-search">Find a song</label>
            <input
              id="song-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or artist…"
            />
            <span>⌕</span>
          </div>
          <div className="song-library-heading">
            <span>Your beatmaps</span>
            <small>
              {visible.length} {visible.length === 1 ? 'song' : 'songs'}
            </small>
          </div>
          <SongList
            maps={visible}
            busyUrl={loader.busyUrl}
            selectedUrl={loader.busyUrl ?? mapset?.sourceUrl}
            onPick={(song) => {
              void loader.pickBundled(song);
            }}
          />
          {visible.length === 0 && (
            <p className="score-empty">No songs match “{search}”. Try another title.</p>
          )}
          {loader.busy && (
            <p role="status" className="score-empty">
              Loading difficulties…
            </p>
          )}
          {mapset && <SongDifficulties mapset={mapset} onPick={(name) => { void loader.pickDifficulty(name); }} />}
          <label className="song-import">
            ＋ Import a beatmap <small>.osz or .osu · or drop it anywhere</small>
            <input
              type="file"
              accept=".osz,.osu"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void loader.handleFile(file);
                }
                event.target.value = '';
              }}
            />
          </label>
          <YourMaps library={library} onOpen={loader.openMapset} />
          {loader.error && (
            <p role="alert" className="song-error">
              {loader.error}
            </p>
          )}
        </aside>
      </main>
      <footer className="song-footer">
        <button className="lazer-back" onClick={() => setScreen('home')}>
          ‹ <span>Back</span>
        </button>
        <span className="song-footer-hint">
          {map ? `${map.meta.title} / ${map.meta.version}` : 'Choose a song to get started'}
        </span>
        <button
          className="song-random"
          disabled={!maps.length || loader.busy}
          onClick={() => {
            const song = maps[Math.floor(Math.random() * maps.length)];
            void loader.pickBundled(song);
          }}
        >
          ⇄ <span>Random</span>
        </button>
        <button
          className="song-start"
          disabled={!map?.audio.byteLength || loader.busy}
          onClick={() => setScreen('calibrate')}
        >
          <strong>airosu!</strong>
          <span>Play ▷</span>
        </button>
      </footer>
    </div>
  );
}
