import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { NavBar } from '../nav';
import { flagEmoji } from '../shared/flag';
import { SelectMenu } from '../shared/SelectMenu';
import { LeaderboardRow } from './LeaderboardRow';

const PAGE = 50;

/** osu!-rankings-style performance table, global or per country. */
export function LeaderboardPage() {
  const [countryCode, setCountryCode] = useState<string>();
  const [offset, setOffset] = useState(0);
  const page = useQuery(api.leaderboard.page, { countryCode, offset });
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
    <div className="webpage">
      <NavBar />
      <main className="webpage__body">
        <header className="board__head">
          <h1 style={{ margin: 0 }}>Performance ranking</h1>
          <SelectMenu
            ariaLabel="Ranking region"
            value={countryCode ?? ''}
            options={countryOptions}
            align="end"
            className="board__country"
            onChange={(value) => {
              setCountryCode(value || undefined);
              setOffset(0);
            }}
          />
        </header>

        {page && page.rows.length === 0 && (
          <p className="board__empty">No scores yet — go set one!</p>
        )}

        {page && page.rows.length > 0 && (
          <table className="board panel">
            <thead>
              <tr>
                <th></th>
                <th style={{ textAlign: 'left' }}>Player</th>
                <th className="board__num">Accuracy</th>
                <th className="board__num">Play count</th>
                <th className="board__num">PP</th>
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
              ‹ Previous
            </button>
            <span className="eyebrow">
              {offset + 1}–{Math.min(offset + PAGE, page.total)} of {page.total}
            </span>
            <button
              className="btn"
              disabled={offset + PAGE >= page.total}
              onClick={() => setOffset((o) => o + PAGE)}
            >
              Next ›
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
