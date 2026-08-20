import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PedometerBanner from '../../components/PedometerBanner.jsx';
import StepRing from '../../components/StepRing.jsx';
import HeroIllustration from '../../components/HeroIllustration.jsx';
import LevelBadgeCard from '../../components/LevelBadgeCard.jsx';
import { useActivitySync } from '../../hooks/useActivitySync.js';
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

export default function HomeStudent() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { status: sensorStatus, requestPermission, liveSteps } = useActivitySync();
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
