'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { createGroup } from '@/lib/groups';
import { useAuth } from '@/context/AuthContext';

export default function CreateGroupModal({ onClose, onCreated }) {
  const { currentUser } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Current user is always member[0]
  const currentMember = {
    id: currentUser.uid,
    uid: currentUser.uid,
    name: currentUser.displayName || currentUser.email?.split('@')[0] || (currentUser.isAnonymous ? 'Guest (Creator)' : 'You'),
    email: currentUser.email || '',
    isGuest: false,
    isCreator: true,
  };

  const allMembers = [currentMember, ...members];

  async function searchUser() {
    if (!searchEmail.trim()) return;
    setSearchError('');
    setSearching(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', searchEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setSearchError('No user found. You can add them as a guest below.');
      } else {
        const userData = snap.docs[0].data();
        const uid = snap.docs[0].id;
        if (uid === currentUser.uid) {
          setSearchError('That\'s you! You\'re already in the group.');
        } else if (members.find((m) => m.uid === uid)) {
          setSearchError('This person is already in the group.');
        } else {
          addMember({
            id: uid,
            uid,
            name: userData.displayName || userData.email.split('@')[0],
            email: userData.email,
            isGuest: false,
          });
          setSearchEmail('');
        }
      }
    } catch (err) {
      setSearchError('Search failed. Try again.');
    } finally {
      setSearching(false);
    }
  }

  function addGuest() {
    if (!guestName.trim()) return;
    const id = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    addMember({ id, uid: null, name: guestName.trim(), email: '', isGuest: true });
    setGuestName('');
  }

  function addMember(m) {
    setMembers((prev) => [...prev, m]);
    setSearchError('');
  }

  function removeMember(id) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleCreate() {
    if (!groupName.trim()) return;
    if (allMembers.length < 2) {
      setSearchError('Add at least one more member to the group.');
      return;
    }
    setLoading(true);
    try {
      const memberUids = [currentUser.uid, ...members.filter((m) => m.uid).map((m) => m.uid)];
      const groupId = await createGroup(
        groupName.trim(),
        allMembers.map((m) => ({
          id: m.id,
          uid: m.uid,
          name: m.name,
          email: m.email,
          isGuest: m.isGuest || false,
          isCreator: m.isCreator || false,
        })),
        currentUser.uid,
        currentMember.name
      );
      // Patch memberUids into the created group (createGroup already handles this)
      onCreated(groupId);
      onClose();
    } catch (err) {
      console.error(err);
      setSearchError('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Create New Group</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group mb-4">
          <label className="form-label">Group Name</label>
          <input
            className="form-input"
            placeholder='e.g. "Goa Trip", "Flatmates"'
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoFocus
            id="input-group-name"
          />
        </div>

        {/* Current members */}
        <div className="mb-4">
          <div className="form-label mb-2">
            Members ({allMembers.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allMembers.map((m) => (
              <div key={m.id} className="member-tag">
                <div className="member-avatar" style={{ width: 22, height: 22, fontSize: '0.62rem' }}>
                  {m.name.slice(0, 1).toUpperCase()}
                </div>
                {m.name}
                {m.isCreator && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(you)</span>}
                {m.isGuest && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>👻</span>}
                {!m.isCreator && (
                  <button className="member-tag-remove" onClick={() => removeMember(m.id)}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Search existing user */}
        <div className="form-group mb-3">
          <label className="form-label">Add by Email (existing user)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="form-input"
              type="email"
              placeholder="friend@email.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              id="input-search-email"
            />
            <button
              className="btn btn-secondary"
              onClick={searchUser}
              disabled={searching || !searchEmail.trim()}
            >
              {searching ? <span className="spinner" style={{ borderTopColor: 'var(--text-primary)' }} /> : 'Add'}
            </button>
          </div>
        </div>

        {/* Add guest */}
        <div className="form-group mb-3">
          <label className="form-label">Add as Guest (no account needed)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="form-input"
              placeholder="Guest's name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGuest()}
              id="input-guest-name"
            />
            <button
              className="btn btn-secondary"
              onClick={addGuest}
              disabled={!guestName.trim()}
            >
              Add
            </button>
          </div>
        </div>

        {searchError && (
          <div className="error-message mb-3" style={{ fontSize: '0.83rem' }}>{searchError}</div>
        )}

        <button
          className="btn btn-primary w-full"
          onClick={handleCreate}
          disabled={loading || !groupName.trim() || allMembers.length < 2}
          id="btn-create-group"
        >
          {loading ? <span className="spinner" /> : '✨ Create Group'}
        </button>
      </div>
    </div>
  );
}
