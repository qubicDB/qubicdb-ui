# QubicDB Console (Admin UI)

**Production-ready admin dashboard for QubicDB**

QubicDB Console is a React-based operator UI for managing QubicDB indexes, inspecting brain state, monitoring neuron activity, running queries, and configuring the server — all from a clean dark-themed interface.

---

## Quick Start

```bash
docker pull qubicdb/qubicdb-ui:1.0.1
docker run -d --name qubicdb-ui -p 8080:80 qubicdb/qubicdb-ui:1.0.1
```

Open `http://localhost:8080`, enter your QubicDB server URL and admin credentials.

---

## Run with QubicDB Server

```bash
docker network create qubicdb-net

docker run -d \
  --name qubicdb \
  --network qubicdb-net \
  -p 6060:6060 \
  -e QUBICDB_ADMIN_ENABLED=true \
  -e QUBICDB_ADMIN_USER=admin \
  -e QUBICDB_ADMIN_PASSWORD=changeme \
  -e QUBICDB_ALLOWED_ORIGINS=http://localhost:8080 \
  qubicdb/qubicdb:1.0.1

docker run -d \
  --name qubicdb-ui \
  --network qubicdb-net \
  -p 8080:80 \
  qubicdb/qubicdb-ui:1.0.1
```

Login at `http://localhost:8080`:
- **Server URL:** `http://localhost:6060`
- **Username:** `admin`
- **Password:** `changeme`

---

## Features

- **Indexes** — list, register, and remove index UUIDs; view neuron/synapse counts and brain lifecycle state per index
- **Brain Inspector** — live activity log, neuron detail view, synapse graph, wake/sleep/reset controls
- **Query** — run associative search and recall queries against any index
- **Metrics** — real-time stats: neuron count, synapse count, avg energy, invocations, daemon status
- **Config** — view runtime server configuration (matrix bounds, lifecycle thresholds, security settings)
- **Settings** — configure server URL; credentials are persisted locally in the browser

---

## Requirements

- A running QubicDB server with `QUBICDB_ADMIN_ENABLED=true`
- Admin credentials configured on the server
- CORS: server must allow the UI origin (e.g. `QUBICDB_ALLOWED_ORIGINS=http://localhost:8080`)

> Direct mutation routes (`/v1/touch`, `/v1/forget`, `/v1/fire`) are intentionally disabled by server policy in the default configuration.

---

## Tags

| Tag | Description |
|---|---|
| `latest` | Latest stable release |
| `1.0.1` | Current stable release (auth session persist fix) |
| `1.0.0` | Initial release |

---

## Links

- **Website:** [qubicdb.github.io/qubicdb-web](https://qubicdb.github.io/qubicdb-web/)
- **Source:** [github.com/qubicDB/qubicdb-ui](https://github.com/qubicDB/qubicdb-ui)
- **QubicDB Server:** [hub.docker.com/r/qubicdb/qubicdb](https://hub.docker.com/r/qubicdb/qubicdb)
- **API Docs:** [qubicdb.github.io/docs](https://qubicdb.github.io/docs/)

---

MIT License · Developed by [Deniz Umut Dereli](https://github.com/denizumutdereli)
