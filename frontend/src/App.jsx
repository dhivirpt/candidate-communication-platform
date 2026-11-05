import { useCallback, useEffect, useRef, useState } from 'react';
import { api, useLiveUpdates } from './api.js';
import StatusBadge from './components/StatusBadge.jsx';
import ProviderHealth from './components/ProviderHealth.jsx';
import AddCandidateModal from './components/AddCandidateModal.jsx';
import ComposeModal from './components/ComposeModal.jsx';
import BulkResultModal from './components/BulkResultModal.jsx';
import HistoryModal from './components/HistoryModal.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';
import Toasts from './components/Toasts.jsx';

export default function App() {
  const [candidates, setCandidates] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);          // {type, ...}
  const [live, setLive] = useState({});               // latest message by id (from SSE)
  const [toasts, setToasts] = useState([]);
  const [healthKey, setHealthKey] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef();

  const toast = (text, type = 'info') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const load = useCallback((q = query) =>
    api.listCandidates(q).then((d) => { setCandidates(d); setLoadError(''); })
      .catch((e) => setLoadError(e.message)), [query]);

  // debounced search
  useEffect(() => { const t = setTimeout(() => load(query), 250); return () => clearTimeout(t); }, [query]);

  // real-time status updates
  useLiveUpdates((m) => {
    setLive((l) => ({ ...l, [m.id]: m }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { load(); setHealthKey((k) => k + 1); }, 400);
  });

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = candidates?.length > 0 && candidates.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  const selectedCandidates = (candidates || []).filter((c) => selected.has(c.id));

  async function retry(id) {
    try {
      const m = await api.retry(id);
      setLive((l) => ({ ...l, [m.id]: m }));
      toast(m.status === 'failed' ? 'Retry failed – see details' : 'Retrying message…', m.status === 'failed' ? 'error' : 'info');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const ids = modal.candidates.map((c) => c.id);
      await api.deleteCandidates(ids);
      setSelected((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; });
      toast(`Deleted ${ids.length} candidate${ids.length > 1 ? 's' : ''}`, 'success');
      setModal(null); load();
    } catch (e) { toast(e.message, 'error'); }
    setDeleting(false);
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Candidates</h1>
        <ProviderHealth refreshKey={healthKey} />
      </header>

      <div className="toolbar">
        <input className="search" placeholder="Search by name, phone or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="spacer" />
        {selected.size > 0 && <>
          <span className="muted">{selected.size} selected</span>
          <button className="btn primary" onClick={() => setModal({ type: 'compose', candidates: selectedCandidates })}>
            Send message ({selected.size})
          </button>
          <button className="btn danger-outline" onClick={() => setModal({ type: 'delete', candidates: selectedCandidates })}>Delete</button>
        </>}
        <button className="btn" onClick={() => setModal({ type: 'add' })}>+ Add candidate</button>
      </div>

      <div className="card">
        {loadError && <div className="banner error">{loadError} <button className="link" onClick={() => load()}>Try again</button></div>}
        {!candidates && !loadError && <div className="empty">Loading candidates…</div>}
        {candidates && candidates.length === 0 && (
          <div className="empty">
            {query ? `No candidates match “${query}”.` : 'No candidates yet. Add your first candidate to get started.'}
            {!query && <div><button className="btn primary" onClick={() => setModal({ type: 'add' })}>+ Add candidate</button></div>}
          </div>
        )}
        {candidates && candidates.length > 0 && (
          <table className="table">
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Name</th><th>Phone</th><th>Email</th><th>Last message</th><th style={{ width: 230 }}>Actions</th>
            </tr></thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className={selected.has(c.id) ? 'selected' : ''}>
                  <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Select ${c.name}`} /></td>
                  <td><b>{c.name}</b></td><td>{c.phone}</td><td>{c.email}</td>
                  <td><StatusBadge status={c.lastStatus} /></td>
                  <td className="row-actions">
                    <button className="link" onClick={() => setModal({ type: 'compose', candidates: [c] })}>Message</button>
                    <button className="link" onClick={() => setModal({ type: 'history', candidate: c })}>History</button>
                    <button className="link danger" onClick={() => setModal({ type: 'delete', candidates: [c] })}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === 'add' && <AddCandidateModal onClose={() => setModal(null)}
        onAdded={(c) => { setModal(null); toast(`${c.name} added`, 'success'); load(); }} />}
      {modal?.type === 'compose' && <ComposeModal candidates={modal.candidates} onClose={() => setModal(null)}
        onSent={(res) => { setSelected(new Set()); setModal({ type: 'results', results: res.results }); load(); }} />}
      {modal?.type === 'results' && <BulkResultModal results={modal.results} live={live} onRetry={retry} onClose={() => setModal(null)} />}
      {modal?.type === 'history' && <HistoryModal candidate={modal.candidate} live={live} onRetry={retry} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <ConfirmModal title="Delete candidates"
        text={`Delete ${modal.candidates.length === 1 ? modal.candidates[0].name : modal.candidates.length + ' candidates'} and their communication history? This can’t be undone.`}
        confirmLabel="Delete" busy={deleting} onConfirm={confirmDelete} onClose={() => setModal(null)} />}
      <Toasts toasts={toasts} />
    </div>
  );
}
