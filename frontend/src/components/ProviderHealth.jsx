import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function ProviderHealth({ refreshKey }) {
  const [h, setH] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => api.providerHealth().then((d) => alive && setH(d)).catch(() => alive && setH({ status: 'down' }));
    load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [refreshKey]);
  if (!h) return null;
  const ok = h.status === 'operational';
  return (
    <div className={`health ${ok ? 'ok' : 'bad'}`} title="Communication service health">
      <span className="dot" /> {ok ? 'Operational' : 'Unavailable'}
      {h.messagesSent !== undefined && (
        <span className="stats">Sent {h.messagesSent} · Delivered {h.messagesDelivered} · Failed {h.messagesFailed}</span>
      )}
    </div>
  );
}
