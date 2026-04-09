'use client';

import React, { useState, useEffect } from 'react';
import { formatINR } from '@/lib/balances';

const SPLIT_EQUAL = 'equal';
const SPLIT_EXACT = 'exact';

export default function AddExpenseModal({ members, groupId, onClose, onSaved, initialData = null }) {
  const isEdit = !!initialData;

  // Step 1: basics
  const [description, setDescription] = useState(initialData?.description || '');
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount?.toString() || '');
  const [step, setStep] = useState(1);

  // Step 2: payers
  const [payerMode, setPayerMode] = useState(initialData?.payerMode || 'single'); // single | multiple
  const [singlePayerId, setSinglePayerId] = useState(
    initialData?.payers?.[0]?.memberId || members[0]?.id || ''
  );
  const [payerAmounts, setPayerAmounts] = useState(() => {
    const map = {};
    members.forEach((m) => { map[m.id] = false; });
    if (initialData?.payers) {
      initialData.payers.forEach((p) => { map[p.memberId] = p.amount.toString(); });
    }
    return map;
  });
  const [payerSelected, setPayerSelected] = useState(() => {
    const set = {};
    members.forEach((m) => { set[m.id] = false; });
    if (initialData?.payers) {
      initialData.payers.forEach((p) => { set[p.memberId] = true; });
    }
    return set;
  });

  // Step 3: splits
  const [splitMode, setSplitMode] = useState(initialData?.splitMode || SPLIT_EQUAL);
  const [splitSelected, setSplitSelected] = useState(() => {
    const set = {};
    if (initialData?.splits) {
      members.forEach((m) => {
        set[m.id] = initialData.splits.some((s) => s.memberId === m.id);
      });
    } else {
      members.forEach((m) => { set[m.id] = true; });
    }
    return set;
  });
  const [splitAmounts, setSplitAmounts] = useState(() => {
    const map = {};
    members.forEach((m) => { map[m.id] = ''; });
    if (initialData?.splits) {
      initialData.splits.forEach((s) => { map[s.memberId] = s.amount.toString(); });
    }
    return map;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const total = parseFloat(totalAmount) || 0;

  // ─── Payer validation ──────────────────────────────────────────
  function getPayerTotal() {
    if (payerMode === 'single') return total;
    return Object.entries(payerSelected)
      .filter(([, v]) => v)
      .reduce((sum, [id]) => sum + (parseFloat(payerAmounts[id]) || 0), 0);
  }

  function getPayerRemaining() {
    return total - getPayerTotal();
  }

  function payerValidationStatus() {
    if (payerMode === 'single') return 'ok';
    const rem = getPayerRemaining();
    if (Math.abs(rem) < 0.01) return 'ok';
    return rem > 0 ? 'under' : 'over';
  }

  // ─── Split validation ──────────────────────────────────────────
  function getSplitTotal() {
    if (splitMode === SPLIT_EQUAL) return total;
    return Object.entries(splitSelected)
      .filter(([, v]) => v)
      .reduce((sum, [id]) => sum + (parseFloat(splitAmounts[id]) || 0), 0);
  }

  function getSplitRemaining() {
    return total - getSplitTotal();
  }

  function splitValidationStatus() {
    if (splitMode === SPLIT_EQUAL) return 'ok';
    const rem = getSplitRemaining();
    if (Math.abs(rem) < 0.01) return 'ok';
    return rem > 0 ? 'under' : 'over';
  }

  // ─── Build final payers ──────────────────────────────────────
  function buildPayers() {
    if (payerMode === 'single') {
      const m = members.find((x) => x.id === singlePayerId);
      return [{ memberId: m.id, name: m.name, amount: total }];
    }
    return Object.entries(payerSelected)
      .filter(([, v]) => v)
      .map(([id]) => {
        const m = members.find((x) => x.id === id);
        return { memberId: id, name: m.name, amount: parseFloat(payerAmounts[id]) || 0 };
      });
  }

  // ─── Build final splits ──────────────────────────────────────
  function buildSplits() {
    const selectedMembers = members.filter((m) => splitSelected[m.id]);
    if (splitMode === SPLIT_EQUAL) {
      const share = total / selectedMembers.length;
      return selectedMembers.map((m) => ({
        memberId: m.id,
        name: m.name,
        amount: Math.round(share * 100) / 100,
      }));
    }
    return selectedMembers.map((m) => ({
      memberId: m.id,
      name: m.name,
      amount: parseFloat(splitAmounts[m.id]) || 0,
    }));
  }

  async function handleSave() {
    if (!description.trim() || total <= 0) {
      setError('Please fill in all fields.');
      return;
    }
    if (splitValidationStatus() !== 'ok') {
      setError('Split amounts must add up exactly to the total.');
      return;
    }
    if (payerMode === 'multiple' && payerValidationStatus() !== 'ok') {
      setError('Payer amounts must add up exactly to the total.');
      return;
    }
    const selectedSplitCount = Object.values(splitSelected).filter(Boolean).length;
    if (selectedSplitCount === 0) {
      setError('Select at least one person to split with.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        description: description.trim(),
        totalAmount: total,
        payers: buildPayers(),
        splits: buildSplits(),
        payerMode,
        splitMode,
      };
      await onSaved(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function ValidationBanner({ status, total, current, label }) {
    if (status === 'ok') {
      return (
        <div className="validation-banner ok">
          ✅ {label} adds up perfectly — {formatINR(total)}
        </div>
      );
    }
    const rem = Math.abs(total - current);
    return (
      <div className={`validation-banner ${status}`}>
        {status === 'under'
          ? `⚠️ Total: ${formatINR(total)} | Still remaining: ${formatINR(rem)}`
          : `🚫 Total: ${formatINR(total)} | Exceeded by: ${formatINR(rem)}`}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator mb-4">
          {[1, 2, 3].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`step-dot ${step === s ? 'active' : step > s ? 'done' : ''}`}>
                {step > s ? '✓' : s}
              </div>
              {i < 2 && <div className={`step-line ${step > s ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="error-message mb-3">{error}</div>}

        {/* ── STEP 1: Basics ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder='e.g. "Dinner at Pizza Palace"'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
                id="input-exp-description"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                id="input-exp-amount"
              />
            </div>
            <button
              className="btn btn-primary w-full mt-2"
              onClick={() => {
                if (!description.trim() || total <= 0) {
                  setError('Enter a description and a valid amount.');
                } else {
                  setError('');
                  setStep(2);
                }
              }}
              id="btn-step1-next"
            >
              Next: Who Paid? →
            </button>
          </div>
        )}

        {/* ── STEP 2: Payers ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="form-label">Total: {formatINR(total)}</div>
              <div className="toggle-group">
                <button
                  className={`toggle-option ${payerMode === 'single' ? 'active' : ''}`}
                  onClick={() => setPayerMode('single')}
                >
                  One paid
                </button>
                <button
                  className={`toggle-option ${payerMode === 'multiple' ? 'active' : ''}`}
                  onClick={() => setPayerMode('multiple')}
                >
                  Multiple paid
                </button>
              </div>
            </div>

            {payerMode === 'single' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map((m) => (
                  <div
                    key={m.id}
                    className={`member-amount-row ${singlePayerId === m.id ? 'selected' : ''}`}
                    onClick={() => setSinglePayerId(m.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="member-name-badge">{m.name.slice(0, 1).toUpperCase()}</div>
                    <div className="member-row-name">{m.name}</div>
                    <input
                      type="radio"
                      name="single-payer"
                      checked={singlePayerId === m.id}
                      onChange={() => setSinglePayerId(m.id)}
                      style={{ accentColor: 'var(--accent)', width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map((m) => (
                  <div
                    key={m.id}
                    className={`member-amount-row ${payerSelected[m.id] ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!payerSelected[m.id]}
                      onChange={(e) => setPayerSelected((prev) => ({ ...prev, [m.id]: e.target.checked }))}
                    />
                    <div className="member-name-badge">{m.name.slice(0, 1).toUpperCase()}</div>
                    <div className="member-row-name">{m.name}</div>
                    {payerSelected[m.id] && (
                      <input
                        type="number"
                        className="member-row-input"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={payerAmounts[m.id] || ''}
                        onChange={(e) => setPayerAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
                <ValidationBanner
                  status={payerValidationStatus()}
                  total={total}
                  current={getPayerTotal()}
                  label="Payer amounts"
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={() => {
                  if (payerMode === 'multiple' && payerValidationStatus() !== 'ok') {
                    setError('Payer amounts must exactly equal ' + formatINR(total));
                    return;
                  }
                  const selectedCount = Object.values(payerSelected).filter(Boolean).length;
                  if (payerMode === 'multiple' && selectedCount === 0) {
                    setError('Select at least one payer.');
                    return;
                  }
                  setError('');
                  setStep(3);
                }}
                id="btn-step2-next"
              >
                Next: How to Split? →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Splits ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="form-label">Total: {formatINR(total)}</div>
              <div className="toggle-group">
                <button
                  className={`toggle-option ${splitMode === SPLIT_EQUAL ? 'active' : ''}`}
                  onClick={() => setSplitMode(SPLIT_EQUAL)}
                >
                  Split equally
                </button>
                <button
                  className={`toggle-option ${splitMode === SPLIT_EXACT ? 'active' : ''}`}
                  onClick={() => setSplitMode(SPLIT_EXACT)}
                >
                  Exact amounts
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map((m) => {
                const selectedCount = Object.values(splitSelected).filter(Boolean).length || 1;
                return (
                  <div
                    key={m.id}
                    className={`member-amount-row ${splitSelected[m.id] ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!splitSelected[m.id]}
                      onChange={(e) => setSplitSelected((prev) => ({ ...prev, [m.id]: e.target.checked }))}
                    />
                    <div className="member-name-badge">{m.name.slice(0, 1).toUpperCase()}</div>
                    <div className="member-row-name">{m.name}</div>
                    {splitMode === SPLIT_EQUAL && splitSelected[m.id] && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {formatINR(total / selectedCount)}
                      </span>
                    )}
                    {splitMode === SPLIT_EXACT && splitSelected[m.id] && (
                      <input
                        type="number"
                        className="member-row-input"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={splitAmounts[m.id] || ''}
                        onChange={(e) => setSplitAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {splitMode === SPLIT_EXACT && (
              <ValidationBanner
                status={splitValidationStatus()}
                total={total}
                current={getSplitTotal()}
                label="Split amounts"
              />
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleSave}
                disabled={saving || splitValidationStatus() !== 'ok'}
                id="btn-save-expense"
              >
                {saving ? <span className="spinner" /> : isEdit ? '💾 Save Changes' : '✅ Add Expense'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
