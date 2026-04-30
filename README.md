### Open Dashboard

Navigate to **http://localhost:5173**

---

## API Reference

Full interactive docs available at:
**http://localhost:3001/api/docs**

### Rules

| Method | Endpoint          | Description             |
| ------ | ----------------- | ----------------------- |
| GET    | /api/v1/rules     | List all blocking rules |
| POST   | /api/v1/rules     | Create a new rule       |
| PUT    | /api/v1/rules/:id | Update a rule           |
| DELETE | /api/v1/rules/:id | Delete a rule           |

### Stats

| Method | Endpoint              | Description                     |
| ------ | --------------------- | ------------------------------- |
| GET    | /api/v1/stats         | Latest engine statistics        |
| GET    | /api/v1/stats/history | Historical snapshots (?limit=N) |

### Upload & Download

| Method | Endpoint                   | Description                 |
| ------ | -------------------------- | --------------------------- |
| POST   | /api/v1/upload             | Upload PCAP → returns jobId |
| GET    | /api/v1/download/:filename | Download filtered output    |

### Rule Schema

```json
{
  "type": "app | domain | ip",
  "value": "youtube | ads.google.com | 192.168.1.1",
  "enabled": true
}
```

---

## WebSocket Events

Connect to `http://localhost:3001` using Socket.io client.

| Event          | Direction       | Payload                        |
| -------------- | --------------- | ------------------------------ |
| `stats:update` | Server → Client | `{ metrics, apps, domains }`   |
| `job:progress` | Server → Client | `{ jobId, progress, stage }`   |
| `job:done`     | Server → Client | `{ jobId, stats, outputFile }` |

---

## Environment Variables

| Variable        | Default                | Description          |
| --------------- | ---------------------- | -------------------- |
| PORT            | 3001                   | Backend server port  |
| REDIS_URL       | redis://127.0.0.1:6379 | Redis connection URL |
| DB_PATH         | ./dpi_engine.db        | SQLite database path |
| FRONTEND_ORIGIN | http://localhost:5173  | CORS allowed origin  |

---

## Database Schema

```sql
-- Blocking rules (persistent across restarts)
CREATE TABLE rules (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT    NOT NULL CHECK(type IN ('app','domain','ip')),
  value      TEXT    NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Stats history (snapshot every 10 seconds)
CREATE TABLE stats_history (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT    NOT NULL DEFAULT (datetime('now')),
  forwarded INTEGER NOT NULL DEFAULT 0,
  dropped   INTEGER NOT NULL DEFAULT 0,
  total     INTEGER NOT NULL DEFAULT 0
);
```

---

## Features

### Dashboard

- Real-time metric cards (WebSocket driven)
- Traffic breakdown charts (Recharts AreaChart)
- Time range selector (5min / 15min / 1hr)
- CSV export of stats history

### Upload

- Drag and drop PCAP upload
- Real-time job progress bar (spring animated)
- Stage-by-stage processing feedback
- Download filtered output on completion

### Rules Manager

- Create / toggle / delete blocking rules
- Rule types: App, Domain, IP
- Import / Export rules as JSON
- Drag-and-drop rule priority ordering

### Network Logs

- Sortable columns
- Real-time search filter
- Pagination (20 rows per page)
- Click-to-expand packet detail drawer

### TopNav

- WebSocket connection status indicator
- Green (Live) / Yellow (Reconnecting) / Red (Disconnected)

---

## Tech Stack

| Layer         | Technology                                   |
| ------------- | -------------------------------------------- |
| UI Framework  | React 18 + TypeScript                        |
| Build Tool    | Vite 8                                       |
| Styling       | Tailwind CSS v4                              |
| Animations    | Motion (motion/react)                        |
| Charts        | Recharts                                     |
| Icons         | Lucide React                                 |
| WebSockets    | Socket.io + socket.io-client                 |
| Drag & Drop   | @dnd-kit/core + @dnd-kit/sortable            |
| Notifications | react-hot-toast                              |
| Backend       | Node.js + Express                            |
| Job Queue     | Bull + Redis                                 |
| Database      | SQLite (better-sqlite3)                      |
| Validation    | Zod                                          |
| Logging       | Winston                                      |
| API Docs      | Swagger (swagger-jsdoc + swagger-ui-express) |
| Engine        | C++ (multi-threaded DPI)                     |
| Build System  | CMake                                        |
