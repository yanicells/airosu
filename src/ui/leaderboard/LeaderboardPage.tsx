import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { flagEmoji } from '../shared/flag';
import { TrophyIcon } from '../shared/icons';
import { OverlayPage } from '../shared/OverlayPage';
import { SelectMenu } from '../shared/SelectMenu';
import { LeaderboardRow } from './LeaderboardRow';

const PAGE = 50;

/** Performance rankings in lazer's overlay style, global or per country. */
export function LeaderboardPage() {
  const [countryCode, setCountryCode] = useState<string>();
  const [offset, setOffset] = useState(0);
  const live = useQuery(api.leaderboard.page, { countryCode, offset });
  // Keep showing the previous page (dimmed) while a new scope or offset loads.
  const [page, setPage] = useState(live);
  if (live !== undefined && live !== page) setPage(live);
  const stale = live === undefined && page !== undefined;
  const countries = useQuery(api.leaderboard.countries);
  const countryOptions = useMemo(
    () => [
      { value: '', label: 'Global', description: 'All ranked players' },
      ...(countries ?? []).map((country) => ({
        value: country.code,
        label: `${flagEmoji(country.code)} ${country.name}`,
      })),
    ],
    [countries],
  );

  return (
    <OverlayPage icon={<TrophyIcon size={26} />} title="rankings">
      <nav className="overlay-tabs overlay-tabs--top">
        <span className="is-active">Performance</span>
        <div className="board-scope">
          <span>Scope</span>
          <SelectMenu
            ariaLabel="Ranking region"
            value={countryCode ?? ''}
            options={countryOptions}
            align="end"
            onChange={(value) => {
              setCountryCode(value || undefined);
              setOffset(0);
            }}
          />
        </div>
      </nav>
      <section className="overlay-section" aria-busy={live === undefined}>
        {page === undefined && <p className="overlay-empty">Loading…</p>}
        {page && page.rows.length === 0 && (
          <p className="overlay-empty">No scores yet — go set one!</p>
        )}
        {page && page.rows.length > 0 && (
          <table className={`board${stale ? ' is-stale' : ''}`}>
            <thead>
              <tr>
                <th></th>
                <th className="board__left">Player</th>
                <th>Accuracy</th>
                <th>Play Count</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <LeaderboardRow key={row.rank} row={row} />
              ))}
            </tbody>
          </table>
        )}
        {page && page.total > PAGE && (
          <div className="board__pager">
            <button
              className="lz-pill"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
            >
              ‹ Previous
            </button>
            <span>
              {offset + 1}–{Math.min(offset + PAGE, page.total)} of {page.total}
            </span>
            <button
              className="lz-pill"
              disabled={offset + PAGE >= page.total}
              onClick={() => setOffset((o) => o + PAGE)}
            >
              Next ›
            </button>
          </div>
        )}
      </section>
    </OverlayPage>
  );
}
