import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import { GearIcon, PlayCircleIcon, TrophyIcon, UserIcon } from '../shared/icons';
import { lz } from '../shared/palette';

function Label({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="menu-button__inner">
      {icon}
      <span>{text}</span>
    </span>
  );
}

const color = (value: string) => ({ '--button-color': value }) as CSSProperties;

/** The slanted colour buttons either side of the logo; only rendered while the menu is open. */
export function MainMenuButtons({
  onPlay,
  onSettings,
}: {
  onPlay: () => void;
  onSettings: () => void;
}) {
  const me = useQuery(api.users.me);
  const { signIn } = useAuthActions();
  return (
    <nav id="home-actions" className="home-actions" aria-label="Main menu">
      <div className="home-actions__left">
        <button className="menu-button" style={color(lz.grey)} onClick={onSettings}>
          <Label icon={<GearIcon size={30} />} text="settings" />
        </button>
      </div>
      <div className="home-actions__right">
        <button className="menu-button" style={color(lz.purpleDark)} onClick={onPlay} autoFocus>
          <Label icon={<PlayCircleIcon size={30} />} text="play" />
        </button>
        <Link className="menu-button" style={color(lz.orange)} to="/leaderboard">
          <Label icon={<TrophyIcon size={30} />} text="rankings" />
        </Link>
        {me ? (
          <Link className="menu-button" style={color(lz.lime)} to={`/u/${me.osuId}`}>
            <Label icon={<UserIcon size={30} />} text="profile" />
          </Link>
        ) : (
          <button
            className="menu-button"
            style={color(lz.lime)}
            disabled={me === undefined}
            onClick={() => void signIn('osu')}
          >
            <Label icon={<UserIcon size={30} />} text="sign in" />
          </button>
        )}
      </div>
    </nav>
  );
}
