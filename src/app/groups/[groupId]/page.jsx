'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import AddExpenseModal from '@/components/AddExpenseModal';
import ConfirmModal from '@/components/ConfirmModal';
import { getGroup } from '@/lib/groups';
import { getGroupExpenses, addExpense, updateExpense, deleteExpense } from '@/lib/expenses';
import { calculateBalances, getSettlements, formatINR } from '@/lib/balances';

export default function GroupPage({ params }) {
  const { groupId } = use(params);
  const { currentUser } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState(null);

  useEffect(() => {
    if (!currentUser) { router.push('/login'); return; }
    loadData();
  }, [currentUser, groupId]);

  async function loadData() {
    setLoading(true);
    try {
      const [g, exps] = await Promise.all([getGroup(groupId), getGroupExpenses(groupId)]);
      if (!g) { router.push('/dashboard'); return; }
      setGroup(g);
      setExpenses(exps);
      const b = calculateBalances(g.members || [], exps);
      setBalances(b);
      setSettlements(getSettlements(b));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(payload) {
    await addExpense(groupId, payload, currentUser.uid);
    await loadData();
  }

  async function handleEditExpense(payload) {
    await updateExpense(groupId, editExpense.id, payload);
    setEditExpense(null);
    await loadData();
  }

  async function handleDeleteExpense(expId) {
    setConfirmDeleteExpense(expId);
  }

  async function executeDeleteExpense() {
    const expId = confirmDeleteExpense;
    setConfirmDeleteExpense(null);
    setDeletingId(expId);
    try {
      await deleteExpense(groupId, expId);
      await loadData();
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getExpenseIcon(desc) {
    const d = desc.toLowerCase();
    if (d.includes('food') || d.includes('dinner') || d.includes('lunch') || d.includes('restaurant') || d.includes('pizza')) return '🍽️';
    if (d.includes('hotel') || d.includes('stay') || d.includes('hostel') || d.includes('room')) return '🏨';
    if (d.includes('travel') || d.includes('taxi') || d.includes('uber') || d.includes('flight') || d.includes('train')) return '🚗';
    if (d.includes('shop') || d.includes('grocery') || d.includes('market')) return '🛒';
    if (d.includes('movie') || d.includes('cinema') || d.includes('entertainment')) return '🎬';
    if (d.includes('drink') || d.includes('bar') || d.includes('beer') || d.includes('coffee')) return '☕';
    return '💳';
  }

  if (!currentUser) return null;

  return (
    <div className="app-container">
      <Navbar />
      <main className="page-content">
        {loading ? (
          <div className="loading-screen" style={{ minHeight: '40vh' }}>
            <div className="loading-spinner-lg" />
          </div>
        ) : !group ? null : (
          <>
            <div className="group-page-header">
              <Link href="/dashboard" className="back-link">
                ← My Groups
              </Link>
              <div className="group-title-row">
                <h1 className="group-title">{group.name}</h1>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAdd(true)}
                  id="btn-add-expense"
                >
                  + Add Expense
                </button>
              </div>
              <p className="text-muted text-sm mt-2">
                {group.members?.length} members ·{' '}
                {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="group-page-grid">
              {/* Left: Expenses */}
              <div>
                <div className="section-header">
                  <div className="section-title">Expenses</div>
                </div>
                {expenses.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                    <div className="empty-state-icon">🧾</div>
                    <h3>No expenses yet</h3>
                    <p>Add your first expense to start tracking!</p>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                      + Add Expense
                    </button>
                  </div>
                ) : (
                  <div className="expenses-list">
                    {expenses.map((exp) => (
                      <div key={exp.id} className="expense-item" id={`expense-${exp.id}`}>
                        <div className="expense-icon">{getExpenseIcon(exp.description)}</div>
                        <div className="expense-details">
                          <div className="expense-desc">{exp.description}</div>
                          <div className="expense-meta">
                            Paid by {exp.payers?.map((p) => p.name).join(', ')} ·{' '}
                            {formatDate(exp.createdAt)}
                          </div>
                          <div className="expense-meta" style={{ marginTop: 2 }}>
                            Split among:{' '}
                            {exp.splits?.map((s) => `${s.name} (${formatINR(s.amount)})`).join(', ')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <div className="expense-amount">{formatINR(exp.totalAmount)}</div>
                          <div className="expense-actions">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditExpense(exp)}
                              id={`btn-edit-expense-${exp.id}`}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteExpense(exp.id)}
                              disabled={deletingId === exp.id}
                              id={`btn-delete-expense-${exp.id}`}
                            >
                              {deletingId === exp.id ? <span className="spinner" /> : '🗑️'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Balances */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Members & Balances */}
                <div className="card">
                  <div className="section-title mb-3">💰 Balances</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {balances.map((b) => (
                      <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="member-name-badge" style={{ width: 30, height: 30, fontSize: '0.72rem' }}>
                              {b.name.slice(0, 1).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{b.name}</span>
                          </div>
                          <span
                            className={`balance-amount ${b.net > 0.01 ? 'positive' : b.net < -0.01 ? 'negative' : 'zero'}`}
                            style={{ fontSize: '0.95rem' }}
                          >
                            {b.net > 0.01 ? '+' : ''}{formatINR(b.net)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', paddingLeft: 38 }}>
                          <span className="text-sm text-muted">
                            Lent: <span style={{ color: 'var(--success)' }}>{formatINR(b.totalPaid)}</span>
                          </span>
                          <span className="text-sm text-muted">
                            Borrowed: <span style={{ color: 'var(--danger)' }}>{formatINR(b.totalOwed)}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settlements */}
                {settlements.length > 0 && (
                  <div className="card">
                    <div className="section-title mb-3">🔄 Settlements</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {settlements.map((s, i) => (
                        <div key={i} className="settlement-item">
                          <span style={{ fontWeight: 600 }}>{s.from}</span>
                          <span className="settlement-arrow">→</span>
                          <span style={{ fontWeight: 600 }}>{s.to}</span>
                          <span className="settlement-amount">{formatINR(s.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted mt-3">
                      Minimum transactions needed to settle all debts
                    </p>
                  </div>
                )}

                {settlements.length === 0 && expenses.length > 0 && (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🎉</div>
                    <div className="section-title">All Settled!</div>
                    <p className="text-sm text-muted mt-2">Everyone is even — no payments needed.</p>
                  </div>
                )}

                {/* Members list */}
                <div className="card">
                  <div className="section-title mb-3">👥 Members</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.members?.map((m) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="member-name-badge" style={{ width: 30, height: 30, fontSize: '0.72rem' }}>
                          {m.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.name}</div>
                          {m.email && (
                            <div className="text-sm text-muted">{m.email}</div>
                          )}
                        </div>
                        {m.isGuest && (
                          <span className="badge badge-neutral" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>Guest</span>
                        )}
                        {m.isCreator && (
                          <span className="badge badge-accent" style={{ marginLeft: m.isGuest ? 4 : 'auto', fontSize: '0.7rem' }}>Creator</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {showAdd && group && (
        <AddExpenseModal
          members={group.members || []}
          groupId={groupId}
          onClose={() => setShowAdd(false)}
          onSaved={handleAddExpense}
        />
      )}

      {editExpense && group && (
        <AddExpenseModal
          members={group.members || []}
          groupId={groupId}
          initialData={editExpense}
          onClose={() => setEditExpense(null)}
          onSaved={handleEditExpense}
        />
      )}

      {confirmDeleteExpense && (
        <ConfirmModal
          title="Delete Expense"
          message="Are you sure you want to delete this expense? This cannot be undone."
          onConfirm={executeDeleteExpense}
          onCancel={() => setConfirmDeleteExpense(null)}
        />
      )}
    </div>
  );
}
