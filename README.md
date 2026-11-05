# Candidate Communication Platform

Recruiters manage candidates, message them individually or in bulk, track delivery status in real time,
handle failures and retry, and view each candidate's communication history.

## Architecture

```
Frontend (React/Vite :5173) --REST /api--> Backend (Express+SQLite :5000) --POST /v1/messages--> Dummy Provider (:4000)
        ^------- SSE (live updates) --------'          ^------------ webhooks (status events) ----------'
```

```
candidate-platform/
├── package.json                 # root scripts (install:all, seed, dev)
├── provider/server.js           # independent dummy provider: send API, lifecycle, webhooks, failures, /health
├── backend/src/
│   ├── index.js config.js db.js errors.js events.js seed.js
│   ├── routes/                  # candidates, messages, webhooks, health
│   └── services/
│       ├── providerClient.js    # the only code that talks to the provider
│       └── messageService.js    # send / bulk / retry / idempotent status updates
└── frontend/src/
    ├── App.jsx api.js styles.css
    └── components/              # StatusBadge, Modal, AddCandidate, Compose, BulkResult, History, Confirm, ProviderHealth, Toasts
```

## Run it (Node 18+)

```bash
npm run install:all     # installs root, provider, backend, frontend
npm run seed            # optional demo candidates
npm run dev             # provider :4000, backend :5000, frontend :5173
```
Open http://localhost:5173

## Simulating provider behaviour (last 4 digits of phone number)

| Ends with | Behaviour                                           | Retryable |
|-----------|-----------------------------------------------------|-----------|
| 0000      | Invalid recipient (400)                             | No        |
| 8888      | Rate limited (429)                                  | Yes       |
| 9999      | Provider unavailable (503)                          | Yes       |
| 7777      | Accepted, then delivery fails (handset unreachable) | Yes       |
| 6666      | Sent, Delivered, never Read                         | -         |
| other     | Sent, Delivered, Read (about 1s / 3s / 6s)          | -         |

Full outage demo: `curl -XPOST localhost:4000/admin/outage -H 'content-type: application/json' -d '{"on":true}'`
(send `{"on":false}` to recover). The provider re-sends ~30% of webhooks to prove idempotency.

## Design decisions

- Bulk send creates one `messages` row per candidate, dispatched concurrently; one failure never blocks others.
- Webhooks are idempotent (`status_events.event_id` UNIQUE) and order-safe (status only moves forward).
- Webhook arriving before the provider id is saved returns 404, so the provider retries with backoff.
- Provider error codes map to friendly text plus a retryable/permanent flag (`errors.js`).
- Webhook -> DB -> Server-Sent Events -> UI, so statuses update without refresh.
- Webhooks are authenticated with a shared secret header.
- Bonus included: templates ({{firstName}}, {{name}}), retry, provider health.

## API

- `GET/POST /api/candidates` (`?q=` search) · `GET/DELETE /api/candidates/:id` · `POST /api/candidates/bulk-delete`
- `GET /api/candidates/:id/messages` (history)
- `POST /api/messages/send` `{candidateIds, body}` · `POST /api/messages/:id/retry`
- `POST /webhooks/provider` · `GET /api/health/provider` · `GET /api/events` (SSE)
