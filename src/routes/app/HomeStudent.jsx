import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScoreRing from '../../components/ScoreRing.jsx';
import { useActivitySync } from '../../hooks/useActivitySync.js';
import { useCurrentUser } from '../../context/CurrentUserContext.jsx';
import { api } from '../../lib/api.js';

const REFRESH_INTERVAL_MS = 30000;

const METRIC_META = [
  { key: 'steps', label: 'צעדים', icon: '👣', unit: '', valueKey: 'steps_value', scoreKey: 'steps_score', missingKey: 'steps_missing', weightKey: 'steps_weight' },
  { key: 'active_minutes', label: 'דקות פעילות', icon: '🏃', unit: " דק'", valueKey: 'active_minutes_value', scoreKey: 'active_minutes_score', missingKey: 'active_minutes_missing', weightKey: 'active_minutes_weight' },
  { key: 'distance', label: 'מרחק', icon: '📍', unit: " ק\"מ", valueKey: 'distance_value', scoreKey: 'distance_score', missingKey: 'distance_missing', weightKey: 'distance_weight' },
  { key: 'vigorous', label: 'פעילות עצימה', icon: '⚡', unit: " דק'", valueKey: 'vigorous_value', scoreKey: 'vigorous_score', missingKey: 'vigorous_missing', weightKey: 'vigorous_weight' },
];

export default function HomeStudent() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { status: sensorStatus, requestPermission } = useActivitySync();
  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');

  const loadSummary = () => {
    api.activitySummary().then(setSummary).catch((err) => setError(err.message));
  };

  useEffect(() => {
    api.activityConfig().then(({ config }) => setConfig(config)).catch(() => {});
    loadSummary();
    const id = setInterval(loadSummary, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="home">
      <h1 className="home__greeting">שלום {user.username} 👋</h1>

      {(sensorStatus === 'idle' || sensorStatus === 'denied') && (
        <section className="card pedometer-banner">
          <span className="pedometer-banner__icon" aria-hidden="true">📍</span>
          <div className="pedometer-banner__text">
            {sensorStatus === 'denied' ? (
              <>
                <p className="pedometer-banner__title">הגישה למד הצעדים נחסמה</p>
                <p className="pedometer-banner__desc">אפשרו גישה לתנועה בהגדרות הדפדפן כדי לספור פעילות בזמן אמת.</p>
              </>
            ) : (
              <>
                <p className="pedometer-banner__title">מד הצעדים כבוי</p>
                <p className="pedometer-banner__desc">הפעילו כדי לספור את הצעדים שלכם היום ישירות מהטלפון.</p>
              </>
            )}
          </div>
          {sensorStatus === 'idle' && (
            <button type="button" className="btn-primary pedometer-banner__cta" onClick={requestPermission}>
              הפעל מד צעדים
            </button>
          )}
        </section>
      )}

      {error && <p className="form-error">{error}</p>}

      {summary && (
        <>
          <section className="card card--hero score-hero">
            <p className="card__label">הציון שלי היום</p>
            <ScoreRing value={summary.today.activity_score} label="מתוך 100" />
            {summary.deltaVsYesterday != null && (
              <p className={`score-hero__delta ${summary.deltaVsYesterday >= 0 ? 'score-hero__delta--up' : 'score-hero__delta--down'}`}>
                {summary.deltaVsYesterday >= 0 ? '↑' : '↓'} {Math.abs(summary.deltaVsYesterday)} לעומת אתמול
              </p>
            )}
          </section>

          <div className="stat-grid stat-grid--4">
            {METRIC_META.map((m) => {
              const value = summary.today[m.valueKey];
              const missing = summary.today[m.missingKey];
              const score = summary.today[m.scoreKey];
              const weight = config?.[m.weightKey];
              return (
                <div className="card stat-tile" key={m.key}>
                  <span className="stat-tile__icon" aria-hidden="true">{m.icon}</span>
                  <p className="stat-tile__value">
                    {missing ? 'אין נתונים' : `${value?.toLocaleString('he-IL')}${m.unit}`}
                  </p>
                  <p className="stat-tile__label">{m.label}</p>
                  {!missing && weight != null && (
                    <p className="stat-tile__sub">{Math.round(score)}/{weight} נק'</p>
                  )}
                </div>
              );
            })}
          </div>

          <section className="card personal-progress">
            <p className="card__label">📈 ההתקדמות שלי</p>
            <p className="personal-progress__headline">{summary.personalProgress.label}</p>
            <p className="personal-progress__sub">בהשוואה לשבוע שעבר, ביחס לביצועים שלכם בלבד</p>
          </section>

          <div className="stat-grid">
            <div className="card stat-tile">
              <span className="stat-tile__icon" aria-hidden="true">📅</span>
              <p className="stat-tile__value">{summary.weeklyAverage ?? '—'}</p>
              <p className="stat-tile__label">ממוצע שבועי</p>
            </div>
            <div className="card stat-tile">
              <span className="stat-tile__icon" aria-hidden="true">🔥</span>
              <p className="stat-tile__value">{summary.streak}</p>
              <p className="stat-tile__label">ימים ברצף</p>
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={() => navigate('/app/content')}>
            📺 תכנים לצפייה — קבלו נקודות
          </button>

          <button type="button" className="btn-ghost btn-ghost--block" onClick={() => navigate('/app/activity-history')}>
            צפו בהיסטוריה המלאה
          </button>
        </>
      )}
    </div>
  );
}
