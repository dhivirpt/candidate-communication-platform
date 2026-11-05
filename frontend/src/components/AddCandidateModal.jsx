import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';

export default function AddCandidateModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { const c = await api.addCandidate(form); onAdded(c); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title="Add candidate" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Name<input autoFocus value={form.name} onChange={set('name')} placeholder="Rahul Sharma" /></label>
        <label>Phone number<input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" /></label>
        <label>Email<input value={form.email} onChange={set('email')} placeholder="rahul@example.com" /></label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Add candidate'}</button>
        </div>
      </form>
    </Modal>
  );
}
