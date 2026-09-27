import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { OverlayPage } from '../shared/OverlayPage';
import { UserIcon } from '../shared/icons';
import { PlayRow } from './PlayRow';
import { ProfileHeader } from './ProfileHeader';

const DAY_MS = 24 * 60 * 60 * 1000;

/** osu!lazer-style player info overlay with best / recent play tabs. */
export function ProfilePage() {
  const params = useParams();
  const osuId = Number(params.osuId);
  const profile = useQuery(api.profile.byOsuId, Number.isNaN(osuId) ? 'skip' : { osuId });
  const syncOsuStats = useAction(api.osuApi.syncOsuStats);
  const syncedRef = useRef<number | undefined>(undefined);
  const [tab, setTab] = useState<'best' | 'recent'>('best');

  const syncedAt = profile?.user.osuStatsSyncedAt;
  useEffect(() => {
    if (!profile || syncedRef.current === osuId) return;
    if (syncedAt !== undefined && Date.now() - syncedAt < DAY_MS) {
      syncedRef.current = osuId;
      return;
    }
    syncedRef.current = osuId;
    void syncOsuStats({ osuId }).catch(() => {});
  }, [profile, syncedAt, osuId, syncOsuStats]);

  const icon = <UserIcon size={26} />;
  if (Number.isNaN(osuId) || profile === null)
    return (
      <OverlayPage icon={icon} title="player info">
        <p className="overlay-empty">Player not found</p>
      </OverlayPage>
    );
  if (profile === undefined)
    return (
      <OverlayPage icon={icon} title="player info">
        <p className="overlay-empty">Loading…</p>
      </OverlayPage>
    );

  const plays = tab === 'best' ? profile.topPlays : profile.recentPlays;
  return (
    <OverlayPage icon={icon} title="player info" cover={profile.topPlays[0]?.map?.coverUrl}>
      <ProfileHeader
        user={profile.user}
        globalRank={profile.globalRank}
        countryRank={profile.countryRank}
        bestGrades={profile.topPlays.map((play) => play.grade)}
      />
      <nav className="overlay-tabs" role="tablist" aria-label="Plays">
        {(['best', 'recent'] as const).map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? 'is-active' : ''}
            onClick={() => setTab(name)}
          >
            {name === 'best' ? 'Best Performance' : 'Recent Plays'}
          </button>
        ))}
      </nav>
      <section className="overlay-section">
        {plays.length === 0 ? (
          <p className="overlay-empty">No plays yet</p>
        ) : (
          <div className="play-list">
            {plays.map((play) => (
              <PlayRow key={play.scoreId} play={play} />
            ))}
          </div>
        )}
      </section>
    </OverlayPage>
  );
}
