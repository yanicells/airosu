import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { usePersonalScores } from '../shared/usePersonalScores';
import { ScoreRow, type RankedScore } from './ScoreRow';

export type RankingScope = 'global' | 'personal';

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="ranking-notice">
      <span aria-hidden="true">!</span>
      {children}
    </p>
  );
}

/** Ranking tab: the map's global top plays with your best pinned below, or your own recent plays. */
export function SongRanking({ osuText, scope }: { osuText: string; scope: RankingScope }) {
  const scores = usePersonalScores(osuText);
  const me = useQuery(api.users.me);
  const board = useQuery(
    api.scores.mapLeaderboard,
    scope === 'global' && scores.mapId ? { mapId: scores.mapId } : 'skip',
  );

  if (!scores.isAuthenticated && !scores.loading)
    return <Notice>Sign in with osu! to see rankings for this beatmap.</Notice>;
  if (scores.error)
    return (
      <Notice>
        {scores.error}{' '}
        <button className="ranking-retry" onClick={scores.retry}>
          Retry
        </button>
      </Notice>
    );
  if (scores.loading || (scope === 'global' && scores.mapId && board === undefined))
    return (
      <p className="ranking-notice" role="status">
        Loading scores…
      </p>
    );

  const mine = (play: NonNullable<typeof scores.history>['recent'][number], rank?: number) =>
    ({
      key: play._id,
      rank,
      name: me?.name ?? 'You',
      image: me?.image,
      countryCode: me?.countryCode,
      playedAt: play._creationTime,
      pp: play.pp,
      maxCombo: play.maxCombo,
      accuracy: play.accuracy,
      score: play.score,
      grade: play.grade,
      mine: true,
    }) satisfies RankedScore;

  if (scope === 'personal') {
    const recent = scores.history?.recent ?? [];
    if (!recent.length) return <Notice>No plays on this difficulty yet. Set your first score!</Notice>;
    return (
      <div className="ranking-list">
        {recent.map((play, index) => (
          <ScoreRow key={play._id} row={mine(play, index + 1)} />
        ))}
      </div>
    );
  }

  const rows: RankedScore[] = (board ?? []).map((row, index) => ({
    key: row.scoreId,
    rank: index + 1,
    name: row.name ?? 'Unknown player',
    image: row.image,
    countryCode: row.countryCode,
    playedAt: row.playedAt,
    pp: row.pp,
    maxCombo: row.maxCombo,
    accuracy: row.accuracy,
    score: row.score,
    grade: row.grade,
    mine: me != null && row.osuId === me.osuId,
  }));
  const best = scores.history?.best;
  if (!rows.length && !best) return <Notice>No scores on this beatmap yet. Be the first!</Notice>;
  const bestRank = best ? rows.findIndex((row) => row.key === best._id) + 1 : 0;
  return (
    <div className="ranking-list">
      {rows.map((row) => (
        <ScoreRow key={row.key} row={row} />
      ))}
      {best && (
        <>
          <p className="ranking-personal-label">Personal Best</p>
          <ScoreRow row={mine(best, bestRank || undefined)} />
        </>
      )}
    </div>
  );
}
