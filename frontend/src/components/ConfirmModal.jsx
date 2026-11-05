import Modal from './Modal.jsx';
export default function ConfirmModal({ title, text, confirmLabel, busy, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</button>
    </>}><p>{text}</p></Modal>
  );
}
