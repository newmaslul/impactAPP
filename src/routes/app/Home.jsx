import ProgressBar from '../../components/ProgressBar.jsx';
import { usePedometer } from '../../hooks/usePedometer.js';
import { useCurrentUser } from '../../context/CurrentUserContext.jsx';
import HomeStudent from './HomeStudent.jsx';

// Mock data — will come from the connected activity source + backend later.
// Steps are the exception: those come live from the phone's accelerometer
// via usePedometer(). DEMO_STEPS only backs the display when that sensor
// isn't available (desktop browsers, permission not yet granted/denied).
const DEMO_STEPS = 7420;
const DAILY_GOAL = 8000;
const ACTIVITY_MIN = 34;
const SLEEP = '7:18';
const TASK = { title: 'הליכה של 20 דקות', subtitle: 'עם עובד מהצוות', points: 100 };
const TEAM = { points: 78420, goal: 100000 };

const fmt = (n) => n.toLocaleString('he-IL');

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
  const { steps, status, requestPermission } = usePedometer();
  const { user } = useCurrentUser();
  const liveMode = status === 'active';
  const displaySteps = liveMode ? steps : DEMO_STEPS;
  const goalPct = Math.min(100, Math.round((displaySteps / DAILY_GOAL) * 100));

  return (
    <div className="home">
      <h1 className="home__greeting">שלום {user.username} 👋</h1>

      {(status === 'idle' || status === 'denied') && (
        <section className="card pedometer-banner">
          <span className="pedometer-banner__icon" aria-hidden="true">📍</span>
          <div className="pedometer-banner__text">
            {status === 'denied' ? (
              <>
                <p className="pedometer-banner__title">הגישה למד הצעדים נחסמה</p>
                <p className="pedometer-banner__desc">אפשרו גישה לתנועה בהגדרות הדפדפן כדי לספור צעדים בזמן אמת.</p>
              </>
            ) : (
              <>
                <p className="pedometer-banner__title">מד הצעדים כבוי</p>
                <p className="pedometer-banner__desc">הפעילו כדי לספור את הצעדים שלכם היום ישירות מהטלפון.</p>
              </>
            )}
          </div>
          {status === 'idle' && (
            <button type="button" className="btn-primary pedometer-banner__cta" onClick={requestPermission}>
              הפעל מד צעדים
            </button>
          )}
        </section>
      )}

      <section className="card card--hero">
        <p className="card__label">המסלול שלי היום</p>
        <p className="stat-big">
          {fmt(displaySteps)}
          <span className="stat-big__unit">צעדים</span>
        </p>
        <ProgressBar value={goalPct} label={`${goalPct}% מהיעד היומי`} />
        <p className="card__meta">
          {goalPct}% מהיעד היומי
          {!liveMode && <span className="card__meta-flag"> · תצוגת דוגמה</span>}
        </p>
      </section>

      <div className="stat-grid">
        <div className="card stat-tile">
          <span className="stat-tile__icon" aria-hidden="true">❤️</span>
          <p className="stat-tile__value">{ACTIVITY_MIN} דק'</p>
          <p className="stat-tile__label">פעילות</p>
        </div>
        <div className="card stat-tile">
          <span className="stat-tile__icon" aria-hidden="true">😴</span>
          <p className="stat-tile__value">{SLEEP}</p>
          <p className="stat-tile__label">שינה</p>
        </div>
      </div>

      <section className="card task-card">
        <p className="card__label">🎯 משימת היום</p>
        <p className="task-card__title">{TASK.title}</p>
        <p className="task-card__subtitle">{TASK.subtitle}</p>
        <div className="task-card__footer">
          <span className="points-pill">+{TASK.points} נקודות</span>
          <button type="button" className="btn-primary task-card__cta">התחל משימה</button>
        </div>
      </section>

      <section className="card">
        <p className="card__label">👥 הצוות שלי</p>
        <p className="card__meta card__meta--emphasis">
          {fmt(TEAM.points)} <span>/ {fmt(TEAM.goal)} נקודות</span>
        </p>
        <ProgressBar
          value={(TEAM.points / TEAM.goal) * 100}
          label={`${fmt(TEAM.points)} מתוך ${fmt(TEAM.goal)} נקודות צוות`}
        />
      </section>
    </div>
  );
}
