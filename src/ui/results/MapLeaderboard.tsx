import { useQuery } from 'convex/react';
import { Link } from 'react-router';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { flagEmoji } from '../shared/flag';
import { gradeColor, type Grade } from './grade';

/** Compact per-map top-10 under the submit panel. */
export function MapLeaderboard({ mapId }: { mapId?: Id<'maps'> }) {
  const rows = useQuery(api.scores.mapLeaderboard, mapId ? { mapId } : 'skip');
  const me = useQuery(api.users.me);
  if (!rows || rows.length === 0) return null;

  return (
    <div className="map-board">
      <p className="eyebrow" style={{ margin: '0 0 6px' }}>
        map leaderboard
      </p>
      {rows.slice(0, 10).map((r, i) => {
        const badges = [
          r.inputMode !== 'relax' && r.inputMode,
          r.cursorAnchor !== 'palm' && r.cursorAnchor,
          r.forgiveness !== 1.5 && `${r.forgiveness}×`,
        ].filter(Boolean);
        const mine = me != null && r.osuId === me.osuId;
        return (
          <div key={r.scoreId} className={`map-board__row${mine ? ' map-board__row--me' : ''}`}>
            <span className="map-board__rank">#{i + 1}</span>
            <span className="map-board__player">
              {r.countryCode && <span>{flagEmoji(r.countryCode)}</span>}
              {r.osuId != null ? <Link to={`/u/${r.osuId}`}>{r.name}</Link> : <span>{r.name}</span>}
            </span>
            {badges.length > 0 && <span className="map-board__badge">{badges.join(' · ')}</span>}
            <span style={{ color: gradeColor(r.grade as Grade), fontWeight: 800 }}>{r.grade}</span>
            <span>{(r.accuracy * 100).toFixed(2)}%</span>
            <span className="map-board__pp">{Math.round(r.pp)}pp</span>
          </div>
        );
      })}
    </div>
  );
}
