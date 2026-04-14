'use client';

import React, { useState } from 'react';
import { formatINR } from '@/lib/balances';

export default function RecordSettlementModal({ initialData, onClose, onSaved }) {
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;

  async function handleSave() {
    if (numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (numAmount > initialData.amount) {
      setError(`Amount cannot exceed the total balance of ${formatINR(initialData.amount)}`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        description: 'Payment',
        isSettlement: true,
        totalAmount: numAmount,
        payers: [{ memberId: initialData.fromId, name: initialData.from, amount: numAmount }],
        splits: [{ memberId: initialData.toId, name: initialData.to, amount: numAmount }],
        payerMode: 'single',
        splitMode: 'exact',
      };
      await onSaved(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Record Payment</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-message mb-3">{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="settlement-item" style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', justifyContent: 'center' }}>
            <span style={{ fontWeight: 600 }}>{initialData.from}</span>
            <span className="settlement-arrow">→</span>
            <span style={{ fontWeight: 600 }}>{initialData.to}</span>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Amount (₹)</label>
            <input
              className="form-input"
              type="number"
              placeholder="0.00"
              min="0.01"
              max={initialData.amount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <div className="text-muted text-sm mt-1">
              Suggested: {formatINR(initialData.amount)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <span className="spinner" /> : '✅ Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
