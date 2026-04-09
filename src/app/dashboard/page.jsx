'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CreateGroupModal from '@/components/CreateGroupModal';
import ConfirmModal from '@/components/ConfirmModal';
import { getUserGroups, deleteGroup } from '@/lib/groups';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    loadGroups();
  }, [currentUser]);

  async function loadGroups() {
    setLoading(true);
    try {
      const g = await getUserGroups(currentUser.uid);
      setGroups(g);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGroup(e, groupId) {
    e.stopPropagation();
    setConfirmDeleteGroup(groupId);
  }

  async function executeDeleteGroup() {
    const groupId = confirmDeleteGroup;
    setConfirmDeleteGroup(null);
    setDeletingId(groupId);
    try {
      await deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } finally {
      setDeletingId(null);
    }
  }

  function handleGroupCreated(groupId) {
    loadGroups();
    router.push(`/groups/${groupId}`);
  }

  if (!currentUser) return null;

  return (
    <div className="app-container">
      <Navbar />
      <main className="page-content">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              Your <span>Groups</span>
            </h1>
            <p className="text-muted text-sm mt-2">
              {groups.length === 0
                ? 'Create your first group to start splitting expenses'
                : `${groups.length} group${groups.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            id="btn-new-group"
          >
            + New Group
          </button>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '40vh' }}>
            <div className="loading-spinner-lg" />
          </div>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏖️</div>
            <h3>No groups yet</h3>
            <p>Create a group and start tracking shared expenses with friends!</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Create First Group
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <div
                key={group.id}
                className="group-card"
                onClick={() => router.push(`/groups/${group.id}`)}
                id={`group-card-${group.id}`}
              >
                <div className="group-card-name">{group.name}</div>
                <div className="group-card-members">
                  {group.members?.length || 0} member{group.members?.length !== 1 ? 's' : ''}
                </div>
                <div className="group-card-footer">
                  <div className="member-avatars">
                    {(group.members || []).slice(0, 5).map((m, i) => (
                      <div
                        key={m.id || i}
                        className="member-avatar-sm"
                        title={m.name}
                        style={{ zIndex: 5 - i }}
                      >
                        {m.name?.slice(0, 1).toUpperCase()}
                      </div>
                    ))}
                    {(group.members?.length || 0) > 5 && (
                      <div className="member-avatar-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '2px solid var(--border)' }}>
                        +{group.members.length - 5}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    onClick={(e) => handleDeleteGroup(e, group.id)}
                    disabled={deletingId === group.id}
                    title="Delete group"
                    id={`btn-delete-group-${group.id}`}
                  >
                    {deletingId === group.id ? <span className="spinner" /> : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={handleGroupCreated}
        />
      )}

      {confirmDeleteGroup && (
        <ConfirmModal
          title="Delete Group"
          message="Delete this group and all its expenses? This cannot be undone."
          onConfirm={executeDeleteGroup}
          onCancel={() => setConfirmDeleteGroup(null)}
        />
      )}
    </div>
  );
}
