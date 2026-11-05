// Tiny Server-Sent-Events hub so the UI updates the moment a webhook arrives.
const clients = new Set();
module.exports = {
  subscribe(req, res) {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
  },
  broadcast(type, data) {
    const frame = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of clients) c.write(frame);
  },
};
