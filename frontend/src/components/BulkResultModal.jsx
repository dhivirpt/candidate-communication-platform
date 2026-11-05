import Modal from './Modal.jsx';
import StatusBadge from './StatusBadge.jsx';

/** Per-candidate outcome of a send. `live` holds the latest status by message id. */
export default function BulkResultModal({ results, live, onRetry, onClose }) {
  const rows = results.map((r) => ({ ...r, message: r.message && (live[r.message.id] || r.message) }));
  const failed = rows.filter((r) => r.error || r.message?.status === 'failed').length;
  return (
    <Modal title="Message results" onClose={onClose} wide footer={<button className="btn primary" onClick={onClose}>Done</button>}>
      <p className={failed ? 'warn' : 'success'}>
        {failed === 0 ? `All ${rows.length} messages were accepted.`
          : `${rows.length - failed} of ${rows.length} succeeded, ${failed} failed. The rest were processed normally.`}
      </p>
      <table className="table">
        <thead><tr><th>Candidate</th><th>Status</th><th>Details</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.candidateId}>
              <td>{r.name}</td>
              <td><StatusBadge status={r.error ? 'failed' : r.message.status} /></td>
              <td>
                {(r.error || r.message.errorMessage) && <div className="error small">{r.error || r.message.errorMessage}</div>}
                {r.message?.status === 'failed' && r.message.retryable &&
                  <button className="link" onClick={() => onRetry(r.message.id)}>Retry</button>}
                {r.message?.status === 'failed' && !r.message.retryable && <span className="muted small">Can’t be retried</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
