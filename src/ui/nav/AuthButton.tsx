import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';

/** Self-contained sign-in button / avatar chip with a profile menu. */
export function AuthButton() {
  const { signIn, signOut } = useAuthActions();
  const me = useQuery(api.users.me);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      faceRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [open]);

  if (me === undefined) return null;
  if (me === null) {
    return (
      <button type="button" className="btn btn--osu" onClick={() => void signIn('osu')}>
        Sign in with osu!
      </button>
    );
  }
  return (
    <div className="auth-chip" ref={rootRef}>
      <button
        ref={faceRef}
        type="button"
        className="auth-chip__face"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="profile-menu"
        onClick={() => setOpen((current) => !current)}
      >
        {me.image && (
          <img src={me.image} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />
        )}
        <span>{me.name}</span>
        <span className="auth-chip__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div id="profile-menu" className="auth-chip__menu" role="menu">
          <Link role="menuitem" to={`/u/${me.osuId}`} onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link role="menuitem" to="/leaderboard" onClick={() => setOpen(false)}>
            Leaderboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
