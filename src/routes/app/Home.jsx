import { useEffect, useState } from 'react';
import ProgressBar from '../../components/ProgressBar.jsx';
import PedometerBanner from '../../components/PedometerBanner.jsx';
import SleepCard from '../../components/SleepCard.jsx';
import { usePedometer } from '../../hooks/usePedometer.js';
import { useSleepSensor } from '../../hooks/useSleepSensor.js';
import { useCurrentUser } from '../../context/CurrentUserContext.jsx';
import { api } from '../../lib/api.js';
import HomeStudent from './HomeStudent.jsx';

const SLEEP_REFRESH_INTERVAL_MS = 8000;

// Mock data — will come from the connected activity source + backend later.
// Steps are the exception: those come live from the phone's accelerometer
// via usePedometer(). DEMO_STEPS only backs the display when that sensor
// isn't available (desktop browsers, permission not yet granted/denied).
const DEMO_STEPS = 7420;
const DAILY_GOAL = 8000;
const ACTIVITY_MIN = 34;
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
  const { status: sleepSensorStatus, requestPermission: requestSleepPermission } = useSleepSensor();
  const { user } = useCurrentUser();
  const liveMode = status === 'active';
  const displaySteps = liveMode ? steps : DEMO_STEPS;
  const goalPct = Math.min(100, Math.round((displaySteps / DAILY_GOAL) * 100));

  const [sleepSummary, setSleepSummary] = useState(null);
  useEffect(() => {
    const load = () => {
      api.sleepSummary().then(setSleepSummary).catch(() => {
        // Best-effort — a failed sleep fetch shouldn't block the rest of the dashboard.
      });
    };
    load();
    const id = setInterval(load, SLEEP_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="home">
      <h1 className="home__greeting">שלום {user.username} 👋</h1>

      <PedometerBanner status={status} requestPermission={requestPermission} />

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

      <div className="card stat-tile">
        <span className="stat-tile__icon" aria-hidden="true">❤️</span>
        <p className="stat-tile__value">{ACTIVITY_MIN} דק'</p>
        <p className="stat-tile__label">פעילות</p>
      </div>

      <SleepCard session={sleepSummary?.session} sensorStatus={sleepSensorStatus} requestPermission={requestSleepPermission} />

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
