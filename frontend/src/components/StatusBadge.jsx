const META = {
  queued:    { label: 'Sending…',  icon: '◔' },
  sent:      { label: 'Sent',      icon: '✓' },
  delivered: { label: 'Delivered', icon: '✓✓' },
  read:      { label: 'Read',      icon: '✓✓' },
  failed:    { label: 'Failed',    icon: '!' },
};
export default function StatusBadge({ status }) {
  if (!status) return <span className="muted">—</span>;
  const m = META[status] || { label: status, icon: '' };
  return <span className={`badge badge-${status}`}><b>{m.icon}</b> {m.label}</span>;
}
