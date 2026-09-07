import { useMemo, useState } from 'react';
import { starterMaps } from '../../beatmap/starterMaps';
import { useAppState } from '../appState';
import { useObjectUrl } from '../useObjectUrl';
import { GameHeader } from '../shared/GameHeader';
import { SongDetails } from './SongDetails';
import { SongList } from './SongList';
import { YourMaps } from './YourMaps';
import { useLibrary } from './useLibrary';
import { useMapLoader } from './useMapLoader';
import { starColor } from './starColor';
import './songSelect.css';

export function MapLoadScreen() {
  const { map, mapset, setScreen } = useAppState();
  const library = useLibrary();
  const loader = useMapLoader(library.save);
  const maps = useMemo(starterMaps, []);
  const [search, setSearch] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string>();
  const bgUrl = useObjectUrl(mapset?.preview.background ?? map?.background);
  const visible = maps.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(search.toLowerCase()));
  const open = (bytes: Uint8Array, label: string) => {
    try { loader.openMapset(bytes, label); loader.setError(null); setSelectedUrl(undefined); }
    catch (error) { loader.setError(error instanceof Error ? error.message : 'Could not open map'); }
  };
  return (
    <div className="lazer-shell song-select" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      event.preventDefault(); const file = event.dataTransfer.files[0];
      if (file) { setSelectedUrl(undefined); void loader.handleFile(file); }
    }}>
      {bgUrl && <div className="song-backdrop" style={{backgroundImage:`url("${bgUrl}")`}} />}
      <GameHeader title="Song select" />
      <main className="song-select-grid">
        <div className="song-left"><SongDetails /></div>
        <aside className="song-right" aria-label="Song selection">
          <div className="song-search"><label htmlFor="song-search">Find a song</label><input id="song-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or artist…" /><span>⌕</span></div>
          <div className="song-library-heading"><span>Your beatmaps</span><small>{visible.length} songs</small></div>
          <SongList maps={visible} busyUrl={loader.busyUrl} selectedUrl={selectedUrl}
            onPick={(song) => { setSelectedUrl(song.url); void loader.pickBundled(song); }} />
          {visible.length === 0 && <p className="score-empty">No songs match “{search}”. Try another title.</p>}
          {loader.busyUrl && <p role="status" className="score-empty">Loading difficulties…</p>}
          {mapset && <div className="lazer-difficulties" aria-label="Difficulties">
            <p>{mapset.label}</p>
            {mapset.preview.difficulties.map((difficulty) => <button key={difficulty.name}
              className={mapset.pickedName === difficulty.name ? 'is-active' : ''}
              style={{'--difficulty-color': starColor(difficulty.stars)} as React.CSSProperties}
              aria-pressed={mapset.pickedName === difficulty.name} onClick={() => loader.pickDifficulty(difficulty.name)}>
              <span>◉</span><div><strong>{difficulty.name}</strong><small>★ {difficulty.stars.toFixed(2)}</small></div>
              <span className="difficulty-chevron">›</span>
            </button>)}
          </div>}
          <label className="song-import">＋ Import a beatmap <small>.osz or .osu · or drop it anywhere</small>
            <input type="file" accept=".osz,.osu" onChange={(event) => {
              const file = event.target.files?.[0]; if (file) { setSelectedUrl(undefined); void loader.handleFile(file); }
              event.target.value = '';
            }} />
          </label>
          <YourMaps library={library} onOpen={open} />
          {loader.error && <p role="alert" className="song-error">{loader.error}</p>}
        </aside>
      </main>
      <footer className="song-footer">
        <button className="lazer-back" onClick={() => setScreen('home')}>‹ <span>Back</span></button>
        <span className="song-footer-hint">{map ? `${map.meta.title} / ${map.meta.version}` : 'Choose a song to get started'}</span>
        <button className="song-random" disabled={!maps.length || !!loader.busyUrl} onClick={() => {
          const song = maps[Math.floor(Math.random() * maps.length)]; setSelectedUrl(song.url); void loader.pickBundled(song);
        }}>⇄ <span>Random</span></button>
        <button className="song-start" disabled={!map?.audio.byteLength || !!loader.busyUrl} onClick={() => setScreen('calibrate')}><strong>airosu!</strong><span>Play ▷</span></button>
      </footer>
    </div>
  );
}
