import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { NavBar } from '../nav';
import { flagEmoji } from '../shared/flag';
import { LeaderboardRow } from './LeaderboardRow';

const PAGE = 50;

/** osu!-rankings-style performance table, global or per country. */
export function LeaderboardPage() {
  const [countryCode, setCountryCode] = useState<string>();
  const [offset, setOffset] = useState(0);
  const page = useQuery(api.leaderboard.page, { countryCode, offset });
  const countries = useQuery(api.leaderboard.countries) ?? [];

  return (
    <div className="webpage">
      <NavBar />
      <main className="webpage__body">
        <header className="board__head">
          <h1 style={{ margin: 0 }}>performance ranking</h1>
          <select
            value={countryCode ?? ''}
            onChange={(e) => {
              setCountryCode(e.target.value || undefined);
              setOffset(0);
            }}
          >
            <option value="">Global</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {flagEmoji(c.code)} {c.name}
              </option>
            ))}
          </select>
        </header>

        {page && page.rows.length === 0 && (
          <p className="board__empty">no scores yet — go set one!</p>
        )}

        {page && page.rows.length > 0 && (
          <table className="board panel">
            <thead>
              <tr>
                <th></th>
                <th style={{ textAlign: 'left' }}>player</th>
                <th className="board__num">accuracy</th>
                <th className="board__num">play count</th>
                <th className="board__num">pp</th>
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
              className="btn"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
            >
              ‹ prev
            </button>
            <span className="eyebrow">
              {offset + 1}–{Math.min(offset + PAGE, page.total)} of {page.total}
            </span>
            <button
              className="btn"
              disabled={offset + PAGE >= page.total}
              onClick={() => setOffset((o) => o + PAGE)}
            >
              next ›
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
