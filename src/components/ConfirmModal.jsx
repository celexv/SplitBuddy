export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Delete', isDanger = true }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p className="mb-4 text-muted">{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary w-full" onClick={onCancel}>Cancel</button>
          <button className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'} w-full`} onClick={onConfirm} id="btn-confirm-modal">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
