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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

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
