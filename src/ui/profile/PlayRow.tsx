import { starColor } from '../home/starColor';
import { gradeColor, type Grade } from '../results/grade';
import { timeAgo } from '../shared/timeAgo';

export interface ProfilePlay {
  scoreId: string;
  pp: number;
  weight?: number;
  accuracy: number;
  grade: string;
  maxCombo: number;
  inputMode: 'relax' | 'manual';
  forgiveness: number;
  cursorAnchor: 'palm' | 'index';
  playedAt: number;
  map: {
    title: string;
    artist: string;
    version: string;
    starRating: number;
    coverUrl?: string;
    rankedStatus?: string;
    osuBeatmapId?: number;
    osuBeatmapSetId?: number;
  } | null;
}

const SHOWN_STATUSES = new Set(['ranked', 'loved', 'approved']);

export function PlayRow({ play }: { play: ProfilePlay }) {
  const map = play.map;
  const badges = [
    play.inputMode !== 'relax' && play.inputMode,
    play.cursorAnchor !== 'palm' && play.cursorAnchor,
    play.forgiveness !== 1.5 && `${play.forgiveness}×`,
  ].filter(Boolean);
  const osuUrl =
    map?.osuBeatmapSetId && map.osuBeatmapId
      ? `https://osu.ppy.sh/beatmapsets/${map.osuBeatmapSetId}#osu/${map.osuBeatmapId}`
      : undefined;

  return (
    <article className="play-row">
      <span className="grade-pill play-row__grade" style={{ background: gradeColor(play.grade as Grade) }}>
        {play.grade}
      </span>
      <div className="play-row__map">
        <span className="play-row__title">
          {osuUrl ? (
            <a href={osuUrl} target="_blank" rel="noreferrer">
              {map?.title ?? 'unknown map'}
            </a>
          ) : (
            (map?.title ?? 'unknown map')
          )}{' '}
          <small>by {map?.artist}</small>
        </span>
        <span className="play-row__meta">
          <span className="play-row__version">{map?.version}</span>
          {map && (
            <span className="play-row__stars" style={{ color: starColor(map.starRating) }}>
              ★ {map.starRating.toFixed(2)}
            </span>
          )}
          {map?.rankedStatus && SHOWN_STATUSES.has(map.rankedStatus) && (
            <span className="play-row__status">{map.rankedStatus}</span>
          )}
          <span>{timeAgo(play.playedAt)}</span>
        </span>
      </div>
      {badges.length > 0 && <span className="play-row__badge">{badges.join(' · ')}</span>}
      <span className="play-row__stat">{(play.accuracy * 100).toFixed(2)}%</span>
      <span className="play-row__stat play-row__combo">{play.maxCombo}x</span>
      <div className="play-row__pp">
        <span>
          {Math.round(play.pp)}
          <small>pp</small>
        </span>
        {play.weight !== undefined && (
          <span className="play-row__weighted">
            weighted {Math.round(play.pp * play.weight)}pp ({Math.round(play.weight * 100)}%)
          </span>
        )}
      </div>
    </article>
  );
}
