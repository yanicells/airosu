import type { CSSProperties } from 'react';
import { grade as gradeFor, gradeColor, type Grade } from '../results/grade';
import { flagEmoji } from '../shared/flag';
import { TrophyIcon } from '../shared/icons';
import { timeAgo } from '../shared/timeAgo';

export interface ProfileUser {
  osuId?: number;
  name?: string;
  image?: string;
  countryCode?: string;
  countryName?: string;
  totalPp: number;
  playCount: number;
  hitAccuracy: number;
  osuPp?: number;
  osuGlobalRank?: number;
  osuStatsSyncedAt?: number;
  joinedAt?: number;
}

const SHOWN_GRADES: Grade[] = ['SS', 'S', 'A', 'B'];

/** Lazer's "player info" block: identity, stat list, rank pills, accuracy bar, grade counts, ranks. */
export function ProfileHeader({
  user,
  globalRank,
  countryRank,
  bestGrades,
}: {
  user: ProfileUser;
  globalRank: number | null;
  countryRank: number | null;
  /** grades of the player's best plays, used for the grade-count pills */
  bestGrades: string[];
}) {
  const overall = gradeFor(user.hitAccuracy);
  const numbers: [string, string][] = [
    ['Performance', `${Math.round(user.totalPp).toLocaleString()}pp`],
    ['Hit Accuracy', `${(user.hitAccuracy * 100).toFixed(2)}%`],
    ['Play Count', user.playCount.toLocaleString()],
    ['Best Plays', bestGrades.length.toLocaleString()],
  ];
  if (user.osuPp !== undefined) numbers.push(['osu! Performance', `${Math.round(user.osuPp).toLocaleString()}pp`]);
  if (user.osuGlobalRank) numbers.push(['osu! Global Rank', `#${user.osuGlobalRank.toLocaleString()}`]);

  return (
    <>
      <section className="profile-info">
        <div className="profile-id">
          {user.image ? <img src={user.image} alt="" /> : <span className="profile-id__avatar" />}
          <div>
            <h2>
              {user.name}
              {user.osuId !== undefined && (
                <a
                  href={`https://osu.ppy.sh/users/${user.osuId}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="osu! profile"
                >
                  ↗
                </a>
              )}
            </h2>
            {user.countryCode && (
              <span className="profile-id__country">
                <span>{flagEmoji(user.countryCode)}</span>
                {user.countryName ?? user.countryCode}
              </span>
            )}
          </div>
        </div>
        <dl className="profile-numbers">
          {numbers.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="profile-bar">
        <span className="profile-pill">
          <TrophyIcon size={16} /> {globalRank ? `#${globalRank.toLocaleString()}` : '—'}
        </span>
        <span className="profile-pill">
          {user.countryCode ? flagEmoji(user.countryCode) : '🌐'}{' '}
          {countryRank ? `#${countryRank.toLocaleString()}` : '—'}
        </span>
        <div
          className="profile-accuracy"
          style={{ '--fill': `${user.hitAccuracy * 100}%` } as CSSProperties}
          title="Hit accuracy"
        >
          <i />
          <small>{(user.hitAccuracy * 100).toFixed(0)}%</small>
        </div>
        <span className="profile-hex" style={{ '--hex': gradeColor(overall) } as CSSProperties}>
          {overall}
        </span>
      </section>

      <section className="profile-detail">
        <div className="profile-detail__left">
          <dl className="profile-trio">
            <div style={{ '--line': '#ff66aa' } as CSSProperties}>
              <dt>Total pp</dt>
              <dd>{Math.round(user.totalPp).toLocaleString()}</dd>
            </div>
            <div style={{ '--line': '#b3d944' } as CSSProperties}>
              <dt>Play count</dt>
              <dd>{user.playCount.toLocaleString()}</dd>
            </div>
            <div style={{ '--line': '#ed1121' } as CSSProperties}>
              <dt>Accuracy</dt>
              <dd>{(user.hitAccuracy * 100).toFixed(2)}%</dd>
            </div>
          </dl>
          <div className="profile-grades">
            {SHOWN_GRADES.map((g) => (
              <div key={g}>
                <span className="grade-pill" style={{ background: gradeColor(g) }}>
                  {g}
                </span>
                <small>{bestGrades.filter((value) => value === g).length}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="profile-ranks">
          <div>
            <small>Global Ranking</small>
            <strong>{globalRank ? `#${globalRank.toLocaleString()}` : '—'}</strong>
          </div>
          <div>
            <small>Country Ranking</small>
            <strong>{countryRank ? `#${countryRank.toLocaleString()}` : '—'}</strong>
          </div>
        </div>
      </section>
      {user.joinedAt !== undefined && (
        <p className="profile-joined">
          Joined <strong>{timeAgo(user.joinedAt)}</strong>
          {user.osuStatsSyncedAt !== undefined && (
            <>
              {' '}
              · osu! stats synced <strong>{timeAgo(user.osuStatsSyncedAt)}</strong>
            </>
          )}
        </p>
      )}
    </>
  );
}
