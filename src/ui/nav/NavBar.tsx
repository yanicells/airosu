import { Link } from 'react-router';
import { AuthButton } from './AuthButton';

/** Site header for the web pages; game routes stay full-bleed. */
export function NavBar() {
  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        airosu<span style={{ color: 'var(--pink)' }}>!</span>
      </Link>
      <nav className="navbar__links">
        <Link to="/leaderboard">leaderboard</Link>
      </nav>
      <AuthButton />
    </header>
  );
}
