import { useEffect, useRef } from 'react';

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method, headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const api = {
  listCandidates: (q = '') => request(`/candidates?q=${encodeURIComponent(q)}`),
  addCandidate: (c) => request('/candidates', { method: 'POST', body: c }),
  deleteCandidates: (ids) => request('/candidates/bulk-delete', { method: 'POST', body: { ids } }),
  history: (id) => request(`/candidates/${id}/messages`),
  send: (candidateIds, body) => request('/messages/send', { method: 'POST', body: { candidateIds, body } }),
  retry: (id) => request(`/messages/${id}/retry`, { method: 'POST' }),
  providerHealth: () => request('/health/provider'),
};

/** Subscribe to real-time message updates (SSE). Browser auto-reconnects. */
export function useLiveUpdates(onUpdate) {
  const ref = useRef(onUpdate);
  ref.current = onUpdate;
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.addEventListener('message.updated', (e) => ref.current(JSON.parse(e.data)));
    return () => es.close();
  }, []);
}

// SQLite stores UTC without a zone marker
export const fmtDate = (s) =>
  new Date(s.replace(' ', 'T') + 'Z').toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
