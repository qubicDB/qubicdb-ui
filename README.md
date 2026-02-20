# QubicDB Console (Admin UI)

Production-oriented React dashboard for operating QubicDB indexes, memory, lifecycle, and runtime config.

[![Docker Hub](https://img.shields.io/docker/v/qubicdb/qubicdb-ui?label=Docker%20Hub&logo=docker&color=0db7ed)](https://hub.docker.com/r/qubicdb/qubicdb-ui)
[![Docker Pulls](https://img.shields.io/docker/pulls/qubicdb/qubicdb-ui?color=0db7ed)](https://hub.docker.com/r/qubicdb/qubicdb-ui)

This README is aligned with:
- QubicDB OpenAPI: [github.com/qubicDB/docs — openapi.yaml](https://github.com/qubicDB/qubicdb/blob/main/openapi.yaml)
- QubicDB API docs: [github.com/qubicDB/docs — API.md](https://github.com/qubicDB/docs/blob/main/API.md)
- Interactive API reference: [qubicdb.github.io/docs](https://qubicdb.github.io/docs/)

---

## What this UI is for

QubicDB Console is an **admin/operator UI**. It focuses on:
- index registry management
- index-level inspection (state, neurons, activity)
- runtime config patching
- daemon/admin actions
- query and context testing

It is not a public end-user app.

---

## Requirements

1. Node.js 18+ (recommended)
2. Running QubicDB server
3. `admin.enabled=true` on server (required for login and most dashboard features)

If admin endpoints are disabled server-side, login and admin pages will fail (expected).

---

## Quick start

### Docker (recommended)

```bash
docker pull qubicdb/qubicdb-ui:1.0.0
docker run -d -p 8080:80 qubicdb/qubicdb-ui:1.0.0
```

UI available at `http://localhost:8080`. Point it to your QubicDB server from the Settings page.

Docker Hub: [hub.docker.com/r/qubicdb/qubicdb-ui](https://hub.docker.com/r/qubicdb/qubicdb-ui)

### Local dev

```bash
npm install
npm run dev
```

Default UI dev URL: `http://localhost:3000`

Build production bundle:

```bash
npm run build
```

Preview production bundle locally:

```bash
npm run preview
```

---

## Docker

### 1) Build/publish UI image

Build image from `qubicdb-ui/Dockerfile`:

```bash
docker build -t qubicdb-ui:latest .
```

Run published image:

```bash
docker run --rm -p 8080:80 qubicdb-ui:latest
```

UI becomes available at `http://localhost:8080`.

### 2) Run UI + QubicDB together

`qubicdb-ui/docker-compose.yml` starts both services for local integration:

```bash
docker compose up -d
```

Exposed ports:
- QubicDB API: `http://localhost:6060`
- QubicDB UI: `http://localhost:8080`

Stop stack:

```bash
docker compose down
```

Compatibility note:
- Compose sets `QUBICDB_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080`
  so browser requests from the UI origin are accepted by QubicDB.

---

## Authentication model

- Login calls `POST /admin/login` with `{ user, password }`.
- On success, credentials are retained in client state and converted to `Authorization: Basic ...` for admin routes.
- The server does not issue tokens/sessions on `/admin/login`; Basic Auth is used for follow-up requests.

Default server-side dev credentials are typically:
- user: `admin`
- password: `qubicdb`

Change these before production.

---

## Server URL configuration

- Default server URL in UI store: `http://localhost:6060`
- Can be changed from Login or Settings page
- Persisted locally (Zustand persisted state)

Important:
- Browser fetch requires HTTP(S) URLs.
- Use `http://...` or `https://...` here (not `qubicdb://` URI scheme).

---

## Feature map

## 1) Overview
- Health and global stats
- Lifecycle distribution
- Daemon status
- Live charts from polling

## 2) Indexes
- List/create/delete registry entries
- Per-index neuron/synapse counts and lifecycle state
- Filtering and pagination

## 3) Index detail
- Index stats and brain state
- Wake/sleep/reset/delete actions
- Search over index neurons
- Activity feed visualization

## 4) Query
- Manual search testing (`/v1/search`)
- Context assembly testing (`/v1/context`)

## 5) Metrics
- Time-series view of worker/lifecycle metrics

## 6) Runtime Config
- Reads `/v1/config`
- Patches `/v1/config` for runtime-safe fields

## 7) Settings
- Server URL update
- Admin daemon and maintenance triggers (GC/persist)

---

## API endpoints used by the UI

Health and metrics:
- `GET /health`
- `GET /v1/stats`

Registry:
- `GET /v1/registry`
- `POST /v1/registry`
- `GET /v1/registry/{uuid}`
- `DELETE /v1/registry/{uuid}`
- `POST /v1/registry/find-or-create`

Brain/index:
- `GET /v1/brain/stats`
- `GET /v1/brain/state`
- `POST /v1/brain/wake`
- `POST /v1/brain/sleep`

Memory/query:
- `GET /v1/recall`
- `GET /v1/read/{id}`
- `POST /v1/write`
- `POST /v1/search`
- `POST /v1/context`

Visualization:
- `GET /v1/graph`
- `GET /v1/synapses`
- `GET /v1/activity`

Admin:
- `POST /admin/login`
- `GET /admin/indexes`
- `GET /admin/indexes/{indexId}`
- `DELETE /admin/indexes/{indexId}`
- `POST /admin/indexes/{indexId}/reset`
- `GET /admin/indexes/{indexId}/export`
- `GET /admin/daemons`
- `POST /admin/daemons/pause`
- `POST /admin/daemons/resume`
- `POST /admin/gc`
- `POST /admin/persist`

Runtime config:
- `GET /v1/config`
- `POST /v1/config`

---

## Runtime config page scope

Config page supports editing runtime-safe fields exposed by server config patch handler:
- `lifecycle.*`
- `daemons.*`
- `worker.maxIdleTime`
- `registry.enabled`
- `matrix.maxNeurons`
- `security.allowedOrigins`
- `security.maxRequestBody`
- `vector.alpha`

Startup-only fields (server addresses, storage paths, etc.) are effectively read-only at runtime.

---

## Polling and load characteristics

The UI uses periodic polling (React Query) for near-live visibility.

Examples:
- health/admin status: every ~5s
- per-index state/stats: ~3s-5s
- metrics streams: ~2s-3s
- config snapshot: ~10s

For large fleets, tune usage patterns or gate dashboard access to reduce background load.

---

## Error handling

The client expects QubicDB standard error envelope:

```json
{
  "ok": false,
  "error": "message",
  "code": "MACHINE_CODE",
  "status": 400
}
```

Common operational codes to watch in UI flows:
- `UNAUTHORIZED`
- `INDEX_ID_REQUIRED`
- `UUID_NOT_REGISTERED`
- `QUERY_REQUIRED`
- `MUTATION_DISABLED`
- `RATE_LIMITED`

---

## Security notes

- Do not run this UI exposed to public internet without network controls.
- Always set a non-default admin password in production.
- Prefer HTTPS between browser and API.
- Restrict CORS (`security.allowedOrigins`) to trusted origins.

---

## Tech stack

- React 18 + TypeScript
- Vite
- TailwindCSS
- TanStack Query
- Zustand
- Recharts
- Lucide React

---

## Notes

- MCP (`/mcp`) is not used by this dashboard; it is intended for LLM clients.
- Direct mutation API routes (`/v1/touch`, `/v1/forget`, `/v1/fire`) are intentionally disabled by server policy.

---

Developed by [Deniz Umut Dereli](https://github.com/denizumutdereli)
