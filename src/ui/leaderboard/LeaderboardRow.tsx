import { Link } from 'react-router';
import { flagEmoji } from '../shared/flag';

export interface BoardRow {
  rank: number;
  osuId?: number;
  name?: string;
  image?: string;
  countryCode?: string;
  totalPp: number;
  hitAccuracy: number;
  playCount: number;
}

export function LeaderboardRow({ row }: { row: BoardRow }) {
  return (
    <tr className="board__row">
      <td className="board__rank">#{row.rank}</td>
      <td className="board__left">
        <span className="board__player">
          {row.image ? (
            <img src={row.image} alt="" width={34} height={34} loading="lazy" />
          ) : (
            <span className="board__avatar" />
          )}
          {row.countryCode && (
            <span title={row.countryCode}>{flagEmoji(row.countryCode)}</span>
          )}
          {row.osuId != null ? (
            <Link to={`/u/${row.osuId}`}>{row.name}</Link>
          ) : (
            <span>{row.name}</span>
          )}
        </span>
      </td>
      <td>{(row.hitAccuracy * 100).toFixed(2)}%</td>
      <td>{row.playCount.toLocaleString()}</td>
      <td className="board__pp">{Math.round(row.totalPp).toLocaleString()}</td>
    </tr>
  );
}
