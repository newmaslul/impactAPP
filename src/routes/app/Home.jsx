import { useNavigate } from 'react-router-dom';
import StepRing from '../../components/StepRing.jsx';
import HeroIllustration from '../../components/HeroIllustration.jsx';
import LevelBadgeCard from '../../components/LevelBadgeCard.jsx';
import { usePedometer } from '../../hooks/usePedometer.js';
import { useCurrentUser } from '../../context/CurrentUserContext.jsx';
import HomeStudent from './HomeStudent.jsx';
import { ChallengeCard } from './Challenges.jsx';

// Mock data — will come from the connected activity source + backend later.
// Steps are the exception: those come live from the phone's accelerometer
// via usePedometer(). DEMO_STEPS only backs the display when that sensor
// isn't available (desktop browsers, permission not yet granted/denied).
const DEMO_STEPS = 7420;
const DAILY_GOAL = 8000;

// Weekly steps aren't tracked anywhere yet (only "today" is, via the live
// sensor) — this is a fixed demo number, same convention as DEMO_STEPS,
// until a real weekly aggregate exists.
const DEMO_WEEKLY_STEPS = 42350;
const WEEKLY_GOAL = 50000;

const LEVEL_TITLE = 'שחקן מתמיד';
const LEVEL_PROGRESS_PCT = 72;

// Lightweight previews of two real challenges (Challenges.jsx owns the
// full list) — same shape ChallengeCard already expects, so this reuses
// that component as-is rather than a parallel card implementation.
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

const fmt = (n) => n.toLocaleString('he-IL');

// Rough demo-only conversions — the app doesn't track calories/distance
// as real metrics yet, this is just enough to fill the stat tiles with
// numbers that move together with the live step count.
const caloriesFromSteps = (steps) => Math.round(steps * 0.04);
const distanceKmFromSteps = (steps) => (steps * 0.00075).toFixed(1);

// A thin branch by account type — kept as two separate child components
// (not an early-return inside one component) so each can call its own
// hooks unconditionally; user.role can change (demo default → fetched
// value) after the initial render, which would otherwise violate the
// rules of hooks.
export default function Home() {
  const { user } = useCurrentUser();
  return user.role === 'student' ? <HomeStudent /> : <HomeEmployee />;
}

function HomeEmployee() {
  const navigate = useNavigate();
  const { steps, status } = usePedometer();
  const { user } = useCurrentUser();
  const liveMode = status === 'active';
  const displaySteps = liveMode ? steps : DEMO_STEPS;
  const goalPct = Math.min(100, Math.round((displaySteps / DAILY_GOAL) * 100));
  const weeklyPct = Math.min(100, Math.round((DEMO_WEEKLY_STEPS / WEEKLY_GOAL) * 100));

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

      <LevelBadgeCard levelTitle={LEVEL_TITLE} progressPct={LEVEL_PROGRESS_PCT} caption="כל צעד מקרב אותך למטרה!" />

      <section className="hero-scene">
        <HeroIllustration className="hero-scene__bg" />
        <div className="hero-scene__rings">
          <div className="hero-scene__ring-block">
            <p className="hero-scene__ring-title">הצעדים שלי היום</p>
            <StepRing value={displaySteps} pct={goalPct} size={148} strokeWidth={12} icon="👟" label="צעדים" />
            <p className="hero-scene__ring-sub">
              {distanceKmFromSteps(displaySteps)} ק"מ
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
      <ChallengeCard challenge={CLASS_CHALLENGE_PREVIEW} onDetails={() => navigate('/app/class-ranking')} />

      <div className="stat-grid">
        <div className="card stat-tile">
          <span className="stat-tile__icon" aria-hidden="true">🔥</span>
          <p className="stat-tile__value">{fmt(caloriesFromSteps(displaySteps))}</p>
          <p className="stat-tile__label">קלוריות</p>
        </div>
        <div className="card stat-tile">
          <span className="stat-tile__icon" aria-hidden="true">📍</span>
          <p className="stat-tile__value">{distanceKmFromSteps(displaySteps)}</p>
          <p className="stat-tile__label">ק"מ</p>
        </div>
      </div>
    </div>
  );
}
