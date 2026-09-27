import { useState } from 'react';
import { starterMaps } from '../../beatmap/starterMaps';
import { useAppState } from '../appState';
import { useObjectUrl } from '../useObjectUrl';
import { AirosuLogo } from '../menu/AirosuLogo';
import { GameHeader } from '../shared/GameHeader';
import { SearchIcon } from '../shared/icons';
import { SongCarousel } from './SongCarousel';
import { SongDetails } from './SongDetails';
import { SongFooter } from './SongFooter';
import { useLibrary } from './useLibrary';
import { useMapLoader } from './useMapLoader';
import './songSelect.css';

/** osu!lazer song select: map artwork behind a wedge on the left and the set carousel on the right. */
export function MapLoadScreen() {
  const { map, mapset, setScreen } = useAppState();
  const library = useLibrary();
  const loader = useMapLoader(library.save);
  const [search, setSearch] = useState('');
  const bgUrl = useObjectUrl(mapset?.preview.background ?? map?.background);
  const total = starterMaps.length + library.entries.length;
  return (
    <div
      className="lazer-shell song-select"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) void loader.handleFile(file);
      }}
    >
      <div
        className="song-backdrop"
        style={bgUrl ? { backgroundImage: `url("${bgUrl}")` } : undefined}
        aria-hidden="true"
      />
      <GameHeader />
      <main className="song-select-grid">
        <div className="song-left">
          <SongDetails />
        </div>
        <aside className="song-right" aria-label="Song selection">
          <div className="song-search">
            <input
              id="song-search"
              aria-label="Search beatmaps"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />
            <SearchIcon size={24} />
            <small>
              {search ? `${total} beatmaps · filtering “${search}”` : `${total} beatmaps`}
            </small>
          </div>
          {(loader.busy || loader.error) && (
            <p role={loader.error ? 'alert' : 'status'} className={`song-toast${loader.error ? ' is-error' : ''}`}>
              {loader.error ?? 'Loading beatmap…'}
            </p>
          )}
          <SongCarousel search={search} starters={starterMaps} library={library} loader={loader} />
        </aside>
      </main>
      <SongFooter
        randomDisabled={!starterMaps.length || loader.busy}
        onRandom={() => void loader.pickBundled(starterMaps[Math.floor(Math.random() * starterMaps.length)])}
        onImport={(file) => void loader.handleFile(file)}
      />
      <AirosuLogo
        className="song-start"
        aria-label={map ? `Play ${map.meta.title} [${map.meta.version}]` : 'Play'}
        disabled={!map?.audio.byteLength || loader.busy}
        onClick={() => setScreen('calibrate')}
      />
    </div>
  );
}
