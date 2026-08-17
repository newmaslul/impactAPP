/** Inline sync status line: "מסנכרן…" while in flight, else the last-synced time, else nothing. */
export default function SyncProgress({ syncing, lastSyncedAt }) {
  if (syncing) return <p className="card__meta">מסנכרן…</p>;
  if (!lastSyncedAt) return null;
  const time = lastSyncedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return <p className="card__meta">סנכרון אחרון: {time}</p>;
}
