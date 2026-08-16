import { useNavigate } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber } from '../../lib/format.js';

// Mock data for the one challenge defined in §6. Once challenges are
// data-driven (§12 admin form) this will come from a lookup by :id.
const CHALLENGE = {
  title: '30 ימים בתנועה',
  goal: 'להיות פעיל לפחות 20 דקות ביום במשך 30 יום.',
  days: 23,
  totalDays: 30,
  points: 1500,
  communityContribution: 500,
};

export default function ChallengeDetail() {
  const navigate = useNavigate();
  const { days, totalDays } = CHALLENGE;

  return (
    <div className="detail-section">
      <SubPageHeader title="פירוט אתגר" onBack={() => navigate('/app/challenges')} />

      <h1>{CHALLENGE.title}</h1>

      <section className="card">
        <p className="card__label">מטרה</p>
        <p className="task-card__subtitle" style={{ fontSize: '0.98rem' }}>{CHALLENGE.goal}</p>
      </section>

      <section className="card">
        <p className="card__label">התקדמות</p>
        <p className="card__meta card__meta--emphasis">
          {days} <span>/ {totalDays}</span>
        </p>
        <div style={{ marginTop: '0.5rem' }}>
          <ProgressBar value={(days / totalDays) * 100} label={`${days} מתוך ${totalDays} ימים`} />
        </div>
      </section>

      <section className="card">
        <p className="card__label">המשימות</p>
        <div className="day-grid" role="list" aria-label="ימי האתגר">
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            const done = day <= days;
            const isToday = day === days + 1;
            return (
              <div
                key={day}
                role="listitem"
                className={`day-cell ${done ? 'day-cell--done' : ''} ${isToday ? 'day-cell--today' : ''}`}
                aria-label={`יום ${day}${done ? ' — הושלם' : ''}`}
              >
                {done ? '✓' : day}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <p className="card__label">פרס</p>
        <span className="points-pill">+{formatNumber(CHALLENGE.points)} נקודות</span>
      </section>

      <p className="impact-note">
        ❤️ השלמת האתגר תתרום <strong>{formatNumber(CHALLENGE.communityContribution)} נקודות</strong> ליעד הקהילתי.
      </p>

      <button type="button" className="btn-primary" onClick={() => navigate('/app/challenges')}>
        המשך
      </button>
    </div>
  );
}
