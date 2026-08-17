// Shared sleep card — used on both the student and employee home
// screens. Labeled "שעות שינה" per product decision (2026-08-17) —
// simpler end-user wording than the original "שינה משוערת" framing. The
// underlying engine is still confidence-gated (see
// supabase/functions/_shared/sleep/README.md) and still renders a
// reduced "אין מספיק נתונים" state instead of a bare number when there
// isn't a confident session — only the "מהימנות נמוכה" pill text itself
// is suppressed now (per the same product decision), not the gating logic.
const STATUS_META = {
  GOOD: { pillClass: 'status-pill--active', label: 'מהימנות גבוהה' },
  ESTIMATED: { pillClass: 'status-pill--scheduled', label: 'משוער' },
};

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export default function SleepCard({ session, sensorStatus, requestPermission, loading }) {
  const showSensorPrompt = sensorStatus === 'idle' || sensorStatus === 'denied';
  const hasReliableSession = session && session.status !== 'LOW_CONFIDENCE' && session.estimated_sleep_minutes > 0;

  return (
    <section className="card sleep-card">
      <div className="sleep-card__header">
        <p className="card__label">😴 שעות שינה</p>
        {STATUS_META[session?.status] && (
          <span className={`status-pill ${STATUS_META[session.status].pillClass}`}>
            {STATUS_META[session.status].label}
          </span>
        )}
      </div>

      {loading ? (
        <p className="card__meta">טוענים…</p>
      ) : hasReliableSession ? (
        <>
          <p className="stat-big">
            {formatDuration(session.estimated_sleep_minutes)}
            <span className="stat-big__unit">שעות</span>
          </p>
          <p className="card__meta">
            {formatTime(session.sleep_start)} — {formatTime(session.sleep_end)}
            {session.interruptions > 0 && ` · ${session.interruptions} יקיצות`}
          </p>
        </>
      ) : (
        <p className="card__meta">
          {session ? 'אין מספיק נתונים לאמוד שינה הלילה — נסו להשאיר את הדפדפן פתוח ליד המיטה.' : 'עדיין אין נתוני שינה.'}
        </p>
      )}

      {showSensorPrompt && (
        <button type="button" className="btn-ghost sleep-card__cta" onClick={requestPermission}>
          {sensorStatus === 'denied' ? 'נסו שוב להפעיל את חיישן השינה' : 'הפעילו מדידת שינה'}
        </button>
      )}
    </section>
  );
}
