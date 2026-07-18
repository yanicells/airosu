import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';

/** Self-contained sign-in button / avatar chip with a profile menu. */
export function AuthButton() {
  const { signIn, signOut } = useAuthActions();
  const me = useQuery(api.users.me);
  const [open, setOpen] = useState(false);

  if (me === undefined) return null; // loading — render nothing, no layout shift
  if (me === null) {
    return (
      <button className="btn btn--osu" onClick={() => void signIn('osu')}>
        sign in with osu!
      </button>
    );
  }
  return (
    <div className="auth-chip">
      <button className="auth-chip__face" onClick={() => setOpen((o) => !o)}>
        {me.image && (
          <img src={me.image} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />
        )}
        <span>{me.name}</span>
      </button>
      {open && (
        <div className="auth-chip__menu" onClick={() => setOpen(false)}>
          <Link to={`/u/${me.osuId}`}>profile</Link>
          <Link to="/leaderboard">leaderboard</Link>
          <button onClick={() => void signOut()}>sign out</button>
        </div>
      )}
    </div>
  );
}
