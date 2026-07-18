import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { NavBar } from '../nav';
import { PlayRow } from './PlayRow';
import { ProfileHeader } from './ProfileHeader';

const DAY_MS = 24 * 60 * 60 * 1000;

export function ProfilePage() {
  const params = useParams();
  const osuId = Number(params.osuId);
  const profile = useQuery(api.profile.byOsuId, Number.isNaN(osuId) ? 'skip' : { osuId });
  const syncOsuStats = useAction(api.osuApi.syncOsuStats);
  const syncedRef = useRef(false);

  const syncedAt = profile?.user.osuStatsSyncedAt;
  useEffect(() => {
    if (!profile || syncedRef.current) return;
    if (syncedAt !== undefined && Date.now() - syncedAt < DAY_MS) return;
    syncedRef.current = true;
    void syncOsuStats({ osuId }).catch(() => {});
  }, [profile, syncedAt, osuId, syncOsuStats]);

  if (Number.isNaN(osuId) || profile === null) {
    return (
      <div className="webpage">
        <NavBar />
        <main className="webpage__body">
          <p className="board__empty">player not found</p>
        </main>
      </div>
    );
  }
  if (profile === undefined) {
    return (
      <div className="webpage">
        <NavBar />
        <main className="webpage__body">
          <p className="board__empty">loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="webpage">
      <NavBar />
      <main className="webpage__body">
        <ProfileHeader
          user={profile.user}
          globalRank={profile.globalRank}
          countryRank={profile.countryRank}
        />

        <section>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            best performance
          </p>
          {profile.topPlays.length === 0 && <p className="board__empty">no plays yet</p>}
          <div className="play-list">
            {profile.topPlays.map((play) => (
              <PlayRow key={play.scoreId} play={play} />
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow" style={{ margin: '0 0 8px' }}>
            recent plays
          </p>
          {profile.recentPlays.length === 0 && <p className="board__empty">no plays yet</p>}
          <div className="play-list">
            {profile.recentPlays.map((play) => (
              <PlayRow key={play.scoreId} play={play} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
