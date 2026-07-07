import type { BundledMap } from '../../beatmap/bundled';

/** osu! song-select style list of the maps shipped with the app. */
export function SongList({
  maps,
  onPick,
  busyUrl,
  selectedUrl,
}: {
  maps: BundledMap[];
  onPick: (m: BundledMap) => void;
  busyUrl: string | null;
  selectedUrl?: string;
}) {
  if (maps.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 520,
        maxWidth: '92vw',
      }}
    >
      <p className="eyebrow" style={{ margin: '0 0 2px' }}>
        Song select <span style={{ opacity: 0.6 }}>— ↑↓ + Enter</span>
      </p>
      {maps.map((m) => (
        <button
          key={m.url}
          className={`panel song-row fade-up${m.url === selectedUrl ? ' song-row--active' : ''}`}
          disabled={busyUrl !== null}
          onClick={() => onPick(m)}
        >
          <span className="song-row__title">
            {m.title}
            {busyUrl === m.url && <span style={{ opacity: 0.6 }}> — loading…</span>}
          </span>
          <span className="song-row__artist">{m.artist}</span>
        </button>
      ))}
    </div>
  );
}
