import type { StarterMap } from '../../beatmap/starterMaps';
import { useObjectUrl } from '../useObjectUrl';
import { useSongBackground } from './useSongBackground';

function SongRow({ map, selected, busy, onPick }: {
  map: StarterMap; selected: boolean; busy: boolean; onPick: () => void;
}) {
  const background = useObjectUrl(useSongBackground(map));
  return <button className={`lazer-song${selected ? ' is-selected' : ''}`} onClick={onPick}
    disabled={busy} aria-pressed={selected}
    style={background ? {backgroundImage:`linear-gradient(90deg,rgba(20,36,39,.98),rgba(20,36,39,.35)),url("${background}")`} : undefined}>
    <span className="song-row-icon">◉</span><span className="song-row-copy"><strong>{map.title}</strong><small>{map.artist}</small><span className="song-row-tag">osu! standard</span></span><span className="song-row-arrow">›</span>
  </button>;
}

export function SongList({ maps, onPick, busyUrl, selectedUrl }: {
  maps: StarterMap[]; onPick: (map: StarterMap) => void; busyUrl: string | null; selectedUrl?: string;
}) {
  return <div className="lazer-song-list" aria-label="Songs">{maps.map((map) => <SongRow
    key={map.id} map={map} selected={selectedUrl === map.url} busy={busyUrl !== null} onPick={() => onPick(map)} />)}</div>;
}
