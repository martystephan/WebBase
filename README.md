<p align="center">
  <img src="public/favicon.svg" alt="WebBase Logo" width="80" height="80">
</p>

<h1 align="center">WebBase</h1>

<p align="center">
  <strong>A lightweight, browser-based MySQL client</strong><br>
  Browse schemas, run queries, and edit rows inline — all from a clean local UI
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat&logo=express" alt="Express">
  <img src="https://img.shields.io/badge/MySQL-2-4479A1?style=flat&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
</p>

---

WebBase is a minimal alternative to phpMyAdmin or TablePlus for when you just want to poke at a database without installing a heavy desktop app. Connect to any MySQL or MariaDB server, browse the schema, run SQL, and edit rows inline.

## Features

- **Multiple connections** — save connection URLs and switch between them; pools are kept warm so reconnecting is instant.
- **Schema sidebar** — browse tables and views, see column types, primary keys, and approximate row counts at a glance.
- **SQL editor** — write any query, run it with `⌘/Ctrl + Enter`, and get results in a paginated table.
- **Inline cell editing** — for simple `SELECT * FROM <table>` queries, double-click a cell to edit it. Changes are committed as parameterized `UPDATE` statements using the table's primary key. Composite PKs and nullable columns are handled.
- **Click-to-query tables** — clicking a table in the sidebar prefills and auto-runs `SELECT * FROM <table> LIMIT 100`.
- **Single-process deployment** — the Express backend can serve the built frontend, so production is one `node` process.
- **Dark mode** — follows your system theme.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI primitives, lucide-react icons
- **Backend:** Express 5, mysql2 (with pooled connections), tsx for dev
- **Tooling:** ESLint 9, TypeScript strict mode

## Getting started

### Prerequisites

- Node.js 20+
- A reachable MySQL or MariaDB server

### Install & run (development)

```bash
npm install
npm run dev
```

This starts both the Vite dev server (frontend) and the Express API (backend) concurrently. Open the URL Vite prints — usually http://localhost:5173.

### Production build

```bash
npm run build
npm start
```

The Express server hosts the built frontend from `dist/` and the API under `/api/*` on the same port (default `5174`, override with `PORT`).

## Self-hosting with Docker

A `Dockerfile` and `docker-compose.yml` are included for one-command deployment.

```bash
docker compose up -d
```

That's it. Open http://localhost:5174 in your browser. The image is a tiny Alpine-based Node 22 build that bundles the compiled frontend and runs the Express server on port `5174`.

### Connecting to a MySQL server on the host

If your MySQL server is running on the same machine as Docker (not in another container), the container can't reach `localhost` directly. Uncomment the `extra_hosts` block in `docker-compose.yml`:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

…then use `mysql://user:pass@host.docker.internal:3306/db` as your connection URL inside WebBase.

### Connecting to a MySQL container

If MySQL also runs in Docker, just put both services on the same compose network and use the service name as the host (e.g. `mysql://user:pass@mysql:3306/db`).

### Changing the port

Edit the `ports` mapping in `docker-compose.yml` — e.g. `"8080:5174"` to publish WebBase on port 8080 of the host.

### Security reminder

WebBase has **no authentication**. Don't expose port `5174` to the public internet. If you need remote access, put it behind a reverse proxy with auth (Caddy + basic auth, Authelia, Tailscale, etc.).

## Connecting to a database

Connections use a standard MySQL URL:

```
mysql://user:password@host:3306/database_name
```

The database name in the path is required — WebBase uses it to scope the schema browser. Connection strings are stored in `localStorage` only; nothing leaves your machine.

## Inline editing — how it works

A result is editable when **all** of the following are true:

- The query is a simple `SELECT ... FROM <table>` (no `JOIN`, `UNION`, or multi-table `FROM`).
- The target is a base table (not a view) that has a primary key.
- Every PK column is included in the result columns.

When those hold, non-PK columns get a small pencil icon in the header. Double-click any of their cells to edit; press `Enter` to commit or `Escape` to cancel. Edits become parameterized `UPDATE` statements scoped by the row's primary key, so they're safe even with quotes/binary data. Empty input on a nullable column commits as `NULL`.

PK columns themselves are intentionally read-only — changing primary keys is rarely what you want and often dangerous.

## Project layout

```
server/index.ts          Express API: pools, /api/test, /api/schema, /api/query
src/
  components/
    Workspace.tsx        Sidebar + editor shell
    Sidebar.tsx          Schema browser
    QueryEditor.tsx      SQL editor + run controls + UPDATE commit logic
    ResultsTable.tsx     Paginated results table with inline cell editing
    ConnectionManager.tsx
    ui/                  Radix-based UI primitives
  lib/
    api.ts               Typed wrapper around the backend
    connections.ts       LocalStorage connection store
    editable.ts          Detects when a query result maps back to one table
  hooks/
    useSchema.ts
    useConnections.ts
```

## Security notes

- WebBase is designed to run **locally**. The Express API has no authentication — do not expose it to the internet.
- The `/api/query` endpoint runs whatever SQL you send. That's the point. Treat it as you would direct shell access to your database.
- All UPDATEs from inline editing use parameter placeholders, so values from the UI are never string-concatenated into SQL.

## License

MIT
