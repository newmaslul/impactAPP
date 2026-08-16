import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Uses Node's built-in SQLite (node:sqlite, stable since Node 22.5) rather
// than better-sqlite3 — same idea (a real, file-backed, synchronous SQL
// database, not a mock), but with zero native compilation required, which
// this machine's toolchain couldn't do for better-sqlite3.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, 'data', 'maslul.db'));

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    department TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    status TEXT NOT NULL DEFAULT 'active',
    password_hash TEXT,
    biometric_enabled INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    weekly_activity INTEGER NOT NULL DEFAULT 0,
    class_id INTEGER REFERENCES classes(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// class_id was added after the original table existed on any database
// created before this feature — add it if it's missing rather than
// requiring a fresh database.
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userColumns.includes('class_id')) {
  db.exec('ALTER TABLE users ADD COLUMN class_id INTEGER REFERENCES classes(id)');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL REFERENCES schools(id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Versioned: a new row per admin change, never mutated, so historical
  -- scores stay reproducible under the config that was effective that day.
  CREATE TABLE IF NOT EXISTS scoring_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    effective_from TEXT NOT NULL,
    steps_goal INTEGER NOT NULL DEFAULT 10000,
    steps_weight REAL NOT NULL DEFAULT 40,
    active_minutes_goal INTEGER NOT NULL DEFAULT 60,
    active_minutes_weight REAL NOT NULL DEFAULT 30,
    distance_goal_km REAL NOT NULL DEFAULT 6,
    distance_weight REAL NOT NULL DEFAULT 15,
    vigorous_minutes_goal INTEGER NOT NULL DEFAULT 20,
    vigorous_weight REAL NOT NULL DEFAULT 15,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- One row per ingestion event (an adapter reporting a reading for a
  -- date) — raw, unvalidated. daily_scores is the derived, scored table.
  CREATE TABLE IF NOT EXISTS raw_daily_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('device_sensor','apple_health','health_connect','fitbit','garmin','manual')),
    steps INTEGER,
    active_minutes INTEGER,
    distance_km REAL,
    vigorous_minutes INTEGER,
    active_energy_kcal REAL,
    sync_batch_id TEXT,
    ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    steps_value INTEGER,
    steps_missing INTEGER NOT NULL DEFAULT 0,
    steps_score REAL NOT NULL DEFAULT 0,
    active_minutes_value INTEGER,
    active_minutes_missing INTEGER NOT NULL DEFAULT 0,
    active_minutes_score REAL NOT NULL DEFAULT 0,
    distance_value REAL,
    distance_missing INTEGER NOT NULL DEFAULT 0,
    distance_score REAL NOT NULL DEFAULT 0,
    vigorous_value INTEGER,
    vigorous_missing INTEGER NOT NULL DEFAULT 0,
    vigorous_score REAL NOT NULL DEFAULT 0,
    raw_total REAL NOT NULL DEFAULT 0,
    max_possible REAL NOT NULL DEFAULT 0,
    activity_score REAL,
    scoring_config_id INTEGER REFERENCES scoring_config(id),
    quality_flags TEXT,
    calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS data_quality_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    metric TEXT NOT NULL,
    flag_type TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

if (db.prepare('SELECT COUNT(*) AS n FROM scoring_config').get().n === 0) {
  db.prepare(`
    INSERT INTO scoring_config (effective_from, steps_goal, steps_weight, active_minutes_goal, active_minutes_weight, distance_goal_km, distance_weight, vigorous_minutes_goal, vigorous_weight)
    VALUES ('2020-01-01', 10000, 40, 60, 30, 6, 15, 20, 15)
  `).run();
}

// Seed the same mock roster the admin screen used to hardcode client-side,
// so a fresh database still demos a populated org — but now every row
// (mock or real) lives in one real, shared table instead of being merged
// together at render time.
const seedCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (seedCount === 0) {
  const insert = db.prepare(`
    INSERT INTO users (phone, username, department, role, status, password_hash, points, weekly_activity)
    VALUES (@phone, @username, @department, @role, @status, @password_hash, @points, @weekly_activity)
  `);
  const seedPassword = bcrypt.hashSync('seed-account-no-login', 10);
  const seedRows = [
    { phone: '0500000001', username: 'איתי כהן', department: 'פיתוח', role: 'employee', status: 'active', password_hash: seedPassword, points: 12400, weekly_activity: 92 },
    { phone: '0500000002', username: 'דנה לוי', department: 'שיווק', role: 'manager', status: 'active', password_hash: seedPassword, points: 11800, weekly_activity: 88 },
    { phone: '0500000003', username: 'יובל מזרחי', department: 'פיתוח', role: 'employee', status: 'active', password_hash: seedPassword, points: 9600, weekly_activity: 95 },
    { phone: '0500000004', username: 'רון אביטן', department: 'מכירות', role: 'employee', status: 'active', password_hash: seedPassword, points: 8700, weekly_activity: 71 },
    { phone: '0500000005', username: 'מאיה שפירא', department: 'כספים', role: 'manager', status: 'active', password_hash: seedPassword, points: 7900, weekly_activity: 64 },
    { phone: '0500000006', username: 'נועה גולן', department: 'שיווק', role: 'employee', status: 'active', password_hash: seedPassword, points: 6800, weekly_activity: 58 },
    { phone: '0500000007', username: 'עידו ברק', department: 'פיתוח', role: 'employee', status: 'invited', password_hash: null, points: 0, weekly_activity: 0 },
    { phone: '0500000008', username: 'שירה כץ', department: 'מכירות', role: 'employee', status: 'active', password_hash: seedPassword, points: 4200, weekly_activity: 40 },
    { phone: '0500000009', username: 'אורי דהן', department: 'כספים', role: 'employee', status: 'inactive', password_hash: seedPassword, points: 3100, weekly_activity: 12 },
    { phone: '0500000010', username: 'טל רוזן', department: 'שיווק', role: 'employee', status: 'active', password_hash: seedPassword, points: 2100, weekly_activity: 51 },
  ];
  db.exec('BEGIN');
  seedRows.forEach((r) => insert.run(r));
  db.exec('COMMIT');
}

export default db;
