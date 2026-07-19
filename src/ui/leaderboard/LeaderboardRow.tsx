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
      <td>
        <span className="board__player">
          {row.image && <img src={row.image} alt="" width={28} height={28} />}
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
      <td className="board__num">{(row.hitAccuracy * 100).toFixed(2)}%</td>
      <td className="board__num">{row.playCount}</td>
      <td className="board__num board__pp">{Math.round(row.totalPp).toLocaleString()}</td>
    </tr>
  );
}
