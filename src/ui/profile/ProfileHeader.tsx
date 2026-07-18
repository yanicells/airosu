import { flagEmoji } from '../shared/flag';

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
}

export function ProfileHeader({
  user,
  globalRank,
  countryRank,
}: {
  user: ProfileUser;
  globalRank: number | null;
  countryRank: number | null;
}) {
  return (
    <header className="profile-head panel">
      <div className="profile-head__id">
        {user.image && <img src={user.image} alt="" width={84} height={84} />}
        <div>
          <h1 style={{ margin: 0 }}>
            {user.countryCode && (
              <span title={user.countryName}>{flagEmoji(user.countryCode)} </span>
            )}
            {user.name}
          </h1>
          {user.osuPp !== undefined && (
            <p className="profile-head__compare">
              real osu!: {Math.round(user.osuPp).toLocaleString()}pp
              {user.osuGlobalRank ? ` (#${user.osuGlobalRank.toLocaleString()})` : ''} · airosu:{' '}
              {Math.round(user.totalPp).toLocaleString()}pp
            </p>
          )}
        </div>
      </div>
      <div className="profile-head__stats">
        <Tile label="global rank" value={globalRank ? `#${globalRank}` : '—'} />
        <Tile
          label="country rank"
          value={
            countryRank && user.countryCode
              ? `${flagEmoji(user.countryCode)} #${countryRank}`
              : '—'
          }
        />
        <Tile label="pp" value={`${Math.round(user.totalPp).toLocaleString()}`} accent />
        <Tile label="play count" value={String(user.playCount)} />
        <Tile label="hit accuracy" value={`${(user.hitAccuracy * 100).toFixed(2)}%`} />
      </div>
    </header>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="profile-tile">
      <span className="eyebrow">{label}</span>
      <span
        className="profile-tile__value"
        style={accent ? { color: 'var(--pink)' } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
