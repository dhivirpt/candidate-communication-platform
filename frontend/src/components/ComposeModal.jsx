import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';

const TEMPLATES = [
  { label: 'Interview reminder', text: 'Hello {{firstName}}, your interview is scheduled for tomorrow at 11:00 AM.' },
  { label: 'Welcome', text: 'Hi {{firstName}}, welcome to our hiring process!' },
  { label: 'Documents', text: 'Hi {{firstName}}, please share your updated resume and ID proof.' },
];

export default function ComposeModal({ candidates, onClose, onSent }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const n = candidates.length;

  async function submit() {
    setBusy(true); setError('');
    try { onSent(await api.send(candidates.map((c) => c.id), body), candidates); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={n === 1 ? `Message ${candidates[0].name}` : `Message ${n} candidates`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={busy || !body.trim()}>
          {busy ? 'Sending…' : n === 1 ? 'Send message' : `Send to ${n} candidates`}
        </button>
      </>}>
      {n > 1 && <div className="chips">{candidates.map((c) => <span key={c.id} className="chip">{c.name}</span>)}</div>}
      <div className="templates">
        <span className="muted">Templates:</span>
        {TEMPLATES.map((t) => <button key={t.label} className="link" onClick={() => setBody(t.text)}>{t.label}</button>)}
      </div>
      <textarea rows={5} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message… use {{name}} or {{firstName}} to personalise." />
      <div className="muted small right">{body.length}/1000</div>
      {error && <p className="error">{error}</p>}
    </Modal>
  );
}
