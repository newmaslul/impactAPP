import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber, formatCompact } from '../../lib/format.js';

// Mock data — will come from the backend once challenges are configurable (§12).
const PERSONAL = { id: 'move-30-days', title: '30 ימים בתנועה', days: 23, totalDays: 30, points: 1500 };
const DEPARTMENTS = [
  { medal: '🥇', name: 'פיתוח', points: 92400 },
  { medal: '🥈', name: 'שיווק', points: 88200 },
  { medal: '🥉', name: 'מכירות', points: 81700 },
];
const IMPACT_CHALLENGE = { current: 6_800_000, goal: 10_000_000 };

export default function Challenges() {
  const navigate = useNavigate();
  const impactPct = Math.round((IMPACT_CHALLENGE.current / IMPACT_CHALLENGE.goal) * 100);

  return (
    <div className="home">
      <h1 className="home__greeting">אתגרים</h1>

      <section className="card">
        <p className="card__label">🔥 האתגר שלי</p>
        <p className="task-card__title">{PERSONAL.title}</p>
        <p className="card__meta card__meta--emphasis" style={{ marginTop: '0.9rem' }}>
          {PERSONAL.days} / {PERSONAL.totalDays} <span>ימים</span>
        </p>
        <div style={{ marginTop: '0.5rem' }}>
          <ProgressBar
            value={(PERSONAL.days / PERSONAL.totalDays) * 100}
            label={`${PERSONAL.days} מתוך ${PERSONAL.totalDays} ימים`}
          />
        </div>
        <div className="task-card__footer">
          <span className="points-pill">+{formatNumber(PERSONAL.points)} נקודות</span>
          <button type="button" className="btn-primary task-card__cta" onClick={() => navigate(`/app/challenges/${PERSONAL.id}`)}>
            המשך
          </button>
        </div>
      </section>

      <section className="card">
        <p className="card__label">👥 אתגר מחלקות</p>
        <div className="leaderboard">
          {DEPARTMENTS.map((d) => (
            <div className="leaderboard__row" key={d.name}>
              <span className="leaderboard__medal" aria-hidden="true">{d.medal}</span>
              <span className="leaderboard__name">{d.name}</span>
              <span className="leaderboard__points">{formatNumber(d.points)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="card__label">❤️ אתגר IMPACT</p>
        <p className="card__meta card__meta--emphasis">
          {formatCompact(IMPACT_CHALLENGE.current)} <span>/ {formatCompact(IMPACT_CHALLENGE.goal)} נקודות</span>
        </p>
        <div style={{ marginTop: '0.5rem' }}>
          <ProgressBar value={impactPct} tone="impact" label={`${impactPct}% מהיעד`} />
        </div>
        <p className="card__meta">{impactPct}%</p>
      </section>
    </div>
  );
}
