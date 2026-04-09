'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { currentUser, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const displayName = currentUser?.displayName || (currentUser?.isAnonymous ? 'Guest' : currentUser?.email?.split('@')[0] || 'User');
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/dashboard" className="navbar-logo">
          <span className="logo-icon">💸</span>
          <span>SplitBuddy</span>
        </Link>

        <div className="navbar-actions">
          <div className="user-pill">
            <div className="user-avatar">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt={displayName} referrerPolicy="no-referrer" />
              ) : (
                initials
              )}
            </div>
            {displayName}
            {currentUser?.isAnonymous && (
              <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>(Guest)</span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} id="btn-signout">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
