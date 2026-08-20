import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScoreRing from '../../components/ScoreRing.jsx';
import PedometerBanner from '../../components/PedometerBanner.jsx';
import SleepCard from '../../components/SleepCard.jsx';
import HealthConnectionCard from '../../components/health/HealthConnectionCard.jsx';
import StepRing from '../../components/StepRing.jsx';
import HeroIllustration from '../../components/HeroIllustration.jsx';
import LevelBadgeCard from '../../components/LevelBadgeCard.jsx';
import { useActivitySync } from '../../hooks/useActivitySync.js';
import { useSleepSensor } from '../../hooks/useSleepSensor.js';
import { useCurrentUser } from '../../context/CurrentUserContext.jsx';
import { api } from '../../lib/api.js';
import { ChallengeCard } from './Challenges.jsx';

const REFRESH_INTERVAL_MS = 8000;
const DEFAULT_STEPS_GOAL = 8000;

// No real weekly-steps aggregate exists yet (only "today" is tracked
// live) — same documented demo fallback already used on the employee
// Home screen, until a real one exists.
const DEMO_WEEKLY_STEPS = 42350;
const WEEKLY_GOAL = 50000;

// Same level concept/copy as Home.jsx (employee) and Achievements.jsx —
// kept identical across all three so "your level" reads as one concept
// app-wide, not three different numbers.
const LEVEL_TITLE = 'שחקן מתמיד';
const LEVEL_PROGRESS_PCT = 72;

const DAILY_CHALLENGE_PREVIEW = {
  id: 'daily-goal',
  icon: '🔥',
  title: 'אתגר יומי',
  subtitle: 'כל צעד מקרב אותך למטרה!',
  current: 15600,
  goal: 25000,
};
const CLASS_CHALLENGE_PREVIEW = {
  id: 'move-30-days',
  icon: '🏆',
  title: 'אתגר כיתתי',
  subtitle: 'כולנו יחד משיגים יותר!',
  current: 7450,
  goal: 20000,
};

// Only used as a last-resort fallback for the day ring's distance
// caption, when the real synced distance isn't available yet — students
// already have a real distance_value from the scoring engine, unlike the
// employee screen which has no real distance metric at all.
const distanceKmFromSteps = (steps) => (steps * 0.00075).toFixed(1);

const METRIC_META = [
  { key: 'steps', label: 'צעדים', icon: '👣', unit: '', valueKey: 'steps_value', scoreKey: 'steps_score', missingKey: 'steps_missing', weightKey: 'steps_weight' },
  { key: 'active_minutes', label: 'דקות פעילות', icon: '🏃', unit: " דק'", valueKey: 'active_minutes_value', scoreKey: 'active_minutes_score', missingKey: 'active_minutes_missing', weightKey: 'active_minutes_weight' },
  { key: 'distance', label: 'מרחק', icon: '📍', unit: " ק\"מ", valueKey: 'distance_value', scoreKey: 'distance_score', missingKey: 'distance_missing', weightKey: 'distance_weight' },
  { key: 'vigorous', label: 'פעילות עצימה', icon: '⚡', unit: " דק'", valueKey: 'vigorous_value', scoreKey: 'vigorous_score', missingKey: 'vigorous_missing', weightKey: 'vigorous_weight' },
];

export default function HomeStudent() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { status: sensorStatus, requestPermission, liveSteps } = useActivitySync();
  const { status: sleepSensorStatus, requestPermission: requestSleepPermission } = useSleepSensor();
  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState(null);
  const [sleepSummary, setSleepSummary] = useState(null);
  const [error, setError] = useState('');

  const loadSummary = () => {
    api.activitySummary().then(setSummary).catch((err) => setError(err.message));
  };

  const loadSleepSummary = () => {
    api.sleepSummary().then(setSleepSummary).catch(() => {
      // Best-effort — a failed sleep fetch shouldn't block the rest of the dashboard.
    });
  };

  useEffect(() => {
    api.activityConfig().then(({ config }) => setConfig(config)).catch(() => {});
    loadSummary();
    loadSleepSummary();
    const id = setInterval(loadSummary, REFRESH_INTERVAL_MS);
    const sleepId = setInterval(loadSleepSummary, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(id);
      clearInterval(sleepId);
    };
  }, []);

  // Today's ring uses the same live-steps-first value the metric tile
  // below already relies on, rather than a demo number — students have a
  // real synced source, unlike the employee screen's mock data.
  const liveMode = sensorStatus === 'active' && liveSteps != null;
  const todaySteps = liveMode ? liveSteps : summary?.today?.steps_value ?? 0;
  const stepsGoal = config?.steps_goal || DEFAULT_STEPS_GOAL;
  const todayPct = Math.min(100, Math.round((todaySteps / stepsGoal) * 100));
  const weeklyPct = Math.min(100, Math.round((DEMO_WEEKLY_STEPS / WEEKLY_GOAL) * 100));
  const hasRealDistance = summary?.today && !summary.today.distance_missing && summary.today.distance_value != null;
  const distanceDisplay = hasRealDistance ? summary.today.distance_value : distanceKmFromSteps(todaySteps);

  return (
    <div className="home">
      <header className="home-topbar">
        <button type="button" className="home-topbar__icon" aria-label="תפריט">☰</button>
        <h1 className="home-topbar__title">המסע שלי</h1>
        <button type="button" className="home-topbar__icon" aria-label="התראות">
          🔔
          <span className="home-topbar__badge">3</span>
        </button>
      </header>

      <p className="home__greeting">שלום {user.username} 👋</p>

      <PedometerBanner status={sensorStatus} requestPermission={requestPermission} />
      <HealthConnectionCard />

      {error && <p className="form-error">{error}</p>}

      <LevelBadgeCard levelTitle={LEVEL_TITLE} progressPct={LEVEL_PROGRESS_PCT} caption="כל צעד מקרב אותך למטרה!" />

      <section className="hero-scene">
        <HeroIllustration className="hero-scene__bg" />
        <div className="hero-scene__rings">
          <div className="hero-scene__ring-block">
            <p className="hero-scene__ring-title">הצעדים שלי היום</p>
            <StepRing value={todaySteps} pct={todayPct} size={148} strokeWidth={12} icon="👟" label="צעדים" />
            <p className="hero-scene__ring-sub">
              {distanceDisplay} ק"מ
              {!liveMode && <span className="card__meta-flag"> · תצוגת דוגמה</span>}
            </p>
          </div>
          <div className="hero-scene__ring-block">
            <p className="hero-scene__ring-title">הצעדים שלי השבוע</p>
            <StepRing value={DEMO_WEEKLY_STEPS} pct={weeklyPct} size={148} strokeWidth={12} icon="📅" label="צעדים" />
          </div>
        </div>
      </section>

      <ChallengeCard challenge={DAILY_CHALLENGE_PREVIEW} onDetails={() => navigate(`/app/challenges/${DAILY_CHALLENGE_PREVIEW.id}`)} />
      <ChallengeCard challenge={CLASS_CHALLENGE_PREVIEW} onDetails={() => navigate(`/app/challenges/${CLASS_CHALLENGE_PREVIEW.id}`)} />

      {summary && (
        <>
          <section className="card card--hero score-hero">
            <p className="card__label">הציון שלי היום</p>
            <ScoreRing value={sleepSummary?.dailyScore ?? summary.today.activity_score} label="מתוך 100" />
            {summary.deltaVsYesterday != null && (
              <p className={`score-hero__delta ${summary.deltaVsYesterday >= 0 ? 'score-hero__delta--up' : 'score-hero__delta--down'}`}>
                {summary.deltaVsYesterday >= 0 ? '↑' : '↓'} {Math.abs(summary.deltaVsYesterday)} לעומת אתמול
              </p>
            )}
          </section>

          <SleepCard session={sleepSummary?.session} sensorStatus={sleepSensorStatus} requestPermission={requestSleepPermission} />

          <div className="stat-grid stat-grid--4">
            {METRIC_META.map((m) => {
              // Steps show the live on-device count instantly while
              // walking, rather than waiting on the throttled sync +
              // poll round trip — everything else still comes from the
              // last synced score, since there's no live source for them.
              const live = m.key === 'steps' && sensorStatus === 'active' && liveSteps != null;
              const value = live ? liveSteps : summary.today[m.valueKey];
              const missing = live ? false : summary.today[m.missingKey];
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

          <button type="button" className="btn-primary" onClick={() => navigate('/app/learning')}>
            📖 למידים וזזים — קבלו XP
          </button>

          <button type="button" className="btn-ghost btn-ghost--block" onClick={() => navigate('/app/activity-history')}>
            צפו בהיסטוריה המלאה
          </button>
        </>
      )}
    </div>
  );
}
