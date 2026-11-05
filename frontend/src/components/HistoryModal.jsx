import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import StatusBadge from './StatusBadge.jsx';
import { api, fmtDate } from '../api.js';

export default function HistoryModal({ candidate, live, onRetry, onClose }) {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.history(candidate.id).then(setMessages).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [candidate.id]);

  // reflect webhook-driven updates immediately
  const list = messages && messages.map((m) => live[m.id] || m);

  return (
    <Modal title={`Communication history – ${candidate.name}`} onClose={onClose} wide>
      <p className="muted">{candidate.phone} · {candidate.email}</p>
      {error && <p className="error">{error} <button className="link" onClick={load}>Retry</button></p>}
      {!list && !error && <p className="muted">Loading history…</p>}
      {list && list.length === 0 && <div className="empty">No messages yet. Send the first message to start the conversation.</div>}
      {list && list.map((m) => (
        <div key={m.id} className="msg">
          <div className="msg-head"><span className="muted small">{fmtDate(m.createdAt)}</span><StatusBadge status={m.status} /></div>
          <p>{m.body}</p>
          {m.status === 'failed' && (
            <div className="error small">
              {m.errorMessage}{' '}
              {m.retryable ? <button className="link" onClick={() => onRetry(m.id)}>Retry</button>
                           : <span className="muted">(permanent – can’t be retried)</span>}
            </div>
          )}
          {m.attempts > 1 && <div className="muted small">Attempts: {m.attempts}</div>}
        </div>
      ))}
    </Modal>
  );
}
