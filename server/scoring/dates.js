// Small date helpers shared by the scoring engine. Dates are always plain
// 'YYYY-MM-DD' strings and always handled in UTC — never the server's
// local timezone — so "today" doesn't silently shift depending on where
// the process happens to run.

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function todayStr() {
  return formatDate(new Date());
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// Calendar week starting Sunday (school-week convention).
export function startOfWeek(date) {
  return addDays(date, -date.getUTCDay());
}

export function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}
