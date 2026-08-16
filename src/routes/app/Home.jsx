import ProgressBar from '../../components/ProgressBar.jsx';

// Mock data — will come from the connected activity source + backend later.
const USER_NAME = 'איתי';
const STEPS = 7420;
const STEPS_GOAL_PCT = 93;
const ACTIVITY_MIN = 34;
const SLEEP = '7:18';
const TASK = { title: 'הליכה של 20 דקות', subtitle: 'עם עובד מהצוות', points: 100 };
const TEAM = { points: 78420, goal: 100000 };

const fmt = (n) => n.toLocaleString('he-IL');

export default function Home() {
  return (
    <div className="home">
      <h1 className="home__greeting">שלום {USER_NAME} 👋</h1>

      <section className="card card--hero">
        <p className="card__label">המסלול שלי היום</p>
        <p className="stat-big">
          {fmt(STEPS)}
          <span className="stat-big__unit">צעדים</span>
        </p>
        <ProgressBar value={STEPS_GOAL_PCT} label={`${STEPS_GOAL_PCT}% מהיעד היומי`} />
        <p className="card__meta">{STEPS_GOAL_PCT}% מהיעד היומי</p>
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
