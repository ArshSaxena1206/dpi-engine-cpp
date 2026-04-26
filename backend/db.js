// ─── SQLite Persistent Storage (better-sqlite3) ─────────────────────────────
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'dpi_engine.db');
const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS rules (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT    NOT NULL CHECK(type IN ('app', 'domain', 'ip')),
    value      TEXT    NOT NULL,
    enabled    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stats_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp  TEXT    NOT NULL DEFAULT (datetime('now')),
    forwarded  INTEGER NOT NULL DEFAULT 0,
    dropped    INTEGER NOT NULL DEFAULT 0,
    total      INTEGER NOT NULL DEFAULT 0
  );
`);

// ─── Prepared Statements ─────────────────────────────────────────────────────
const stmts = {
  // Rules
  insertRule:      db.prepare('INSERT INTO rules (type, value, enabled) VALUES (?, ?, ?)'),
  getAllRules:      db.prepare('SELECT * FROM rules ORDER BY created_at DESC'),
  getRuleById:     db.prepare('SELECT * FROM rules WHERE id = ?'),
  updateRule:      db.prepare('UPDATE rules SET type = ?, value = ?, enabled = ? WHERE id = ?'),
  deleteRule:      db.prepare('DELETE FROM rules WHERE id = ?'),
  getEnabledRules: db.prepare('SELECT * FROM rules WHERE enabled = 1'),

  // Stats history
  insertStats:     db.prepare('INSERT INTO stats_history (forwarded, dropped, total) VALUES (?, ?, ?)'),
  getStatsHistory: db.prepare('SELECT * FROM stats_history ORDER BY timestamp DESC LIMIT ?'),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert SQLite row (enabled 0/1) → API shape (enabled true/false) */
function formatRule(row) {
  if (!row) return null;
  return { ...row, enabled: Boolean(row.enabled) };
}

module.exports = { db, stmts, formatRule };
