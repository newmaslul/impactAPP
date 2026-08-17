// Shared sleep card — used on both the student and employee home
// screens. Always labeled "שינה משוערת" (estimated sleep), never
// presented as a certain measurement — this is a phone-only estimation
// engine, not a medical device. Renders a reduced "אין מספיק נתונים"
// state whenever there isn't a confident session to show, rather than a
// bare, potentially-misleading number.

const STATUS_META = {
  GOOD: { pillClass: 'status-pill--active', label: 'מהימנות גבוהה' },
  ESTIMATED: { pillClass: 'status-pill--scheduled', label: 'משוער' },
  LOW_CONFIDENCE: { pillClass: 'status-pill--ended', label: 'מהימנות נמוכה' },
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
        <p className="card__label">😴 שינה משוערת</p>
        {session?.status && (
          <span className={`status-pill ${STATUS_META[session.status]?.pillClass ?? 'status-pill--ended'}`}>
            {STATUS_META[session.status]?.label ?? session.status}
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
