const cfg = require('../config');

class ProviderError extends Error {
  constructor(code, detail) { super(detail || code); this.code = code; }
}

async function call(path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), cfg.providerTimeoutMs);
  try {
    return await fetch(cfg.providerUrl + path, {
      ...opts, signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.providerApiKey },
    });
  } catch {
    throw new ProviderError('provider_unreachable');
  } finally { clearTimeout(t); }
}

/** Sends a message. Returns { id }. Throws ProviderError(code) on failure. */
async function sendMessage({ to, body, reference }) {
  const res = await call('/v1/messages', {
    method: 'POST',
    body: JSON.stringify({ to, body, reference, callbackUrl: `${cfg.publicUrl}/webhooks/provider` }),
  });
  if (res.ok) return res.json();
  const data = await res.json().catch(() => ({}));
  if (res.status === 429) throw new ProviderError('rate_limited');
  if (res.status >= 500) throw new ProviderError('service_unavailable');
  throw new ProviderError(data.error || 'provider_error', data.message);
}

async function getHealth() {
  try {
    const res = await fetch(cfg.providerUrl + '/health', { signal: AbortSignal.timeout(2000) });
    return await res.json();
  } catch { return null; }
}

module.exports = { sendMessage, getHealth, ProviderError };
