import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber, formatCompact } from '../../lib/format.js';

// Mock data — will come from the backend once challenges are configurable (§12).
const ACTIVE_CHALLENGES = [
  {
    id: 'weekly-steps',
    icon: '🏆',
    title: 'אתגר שבועי',
    subtitle: 'לכו 70,000 צעדים השבוע',
    current: 48200,
    goal: 70000,
  },
  {
    id: 'move-30-days',
    icon: '👨‍👩‍👧',
    title: 'אתגר קבוצתי',
    subtitle: 'הקבוצה שהולכת הכי הרבה',
    daysLeft: 2,
  },
  {
    id: 'daily-goal',
    icon: '🎯',
    title: 'אתגר יומי',
    subtitle: 'הליכה של 10,000 צעדים',
    done: true,
  },
];

const COMPLETED_CHALLENGES = [
  { id: 'last-month', icon: '✅', title: 'אתגר החודש שעבר', subtitle: '400,000 צעדים כקבוצה', points: 800 },
];

const DEPARTMENTS = [
  { medal: '🥇', name: 'פיתוח', points: 92400 },
  { medal: '🥈', name: 'שיווק', points: 88200 },
  { medal: '🥉', name: 'מכירות', points: 81700 },
];
const IMPACT_CHALLENGE = { current: 6_800_000, goal: 10_000_000 };

export function ChallengeCard({ challenge, onDetails }) {
  const pct = challenge.goal ? Math.round((challenge.current / challenge.goal) * 100) : null;
  return (
    <section className="card challenge-card">
      <div className="challenge-card__top">
        <div>
          <p className="challenge-card__title">{challenge.title}</p>
          <p className="challenge-card__subtitle">{challenge.subtitle}</p>
        </div>
        <span className="challenge-card__icon" aria-hidden="true">{challenge.icon}</span>
      </div>

      {pct != null && (
        <>
          <ProgressBar value={pct} label={`${formatNumber(challenge.current)} מתוך ${formatNumber(challenge.goal)}`} />
          <div className="challenge-card__footer">
            <span className="challenge-card__progress-note" dir="ltr">
              {formatNumber(challenge.current)} / {formatNumber(challenge.goal)}
            </span>
          </div>
        </>
      )}

      {challenge.daysLeft != null && (
        <div className="challenge-card__footer">
          <span className="challenge-card__meta">⏳ {challenge.daysLeft} ימים נשארו</span>
          <button type="button" className="btn-primary challenge-card__cta" onClick={() => onDetails(challenge)}>
            לפרטים
          </button>
        </div>
      )}

      {challenge.done && (
        <div className="challenge-card__footer">
          <span />
          <span className="challenge-card__done">הושלם ✓</span>
        </div>
      )}
    </section>
  );
}

export default function Challenges() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');
  const impactPct = Math.round((IMPACT_CHALLENGE.current / IMPACT_CHALLENGE.goal) * 100);
  const list = tab === 'active' ? ACTIVE_CHALLENGES : COMPLETED_CHALLENGES;

  return (
    <div className="home">
      <h1 className="home__greeting">אתגרים</h1>

      <div className="tab-switch" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'completed'}
          className={`tab-switch__btn ${tab === 'completed' ? 'tab-switch__btn--active' : ''}`}
          onClick={() => setTab('completed')}
        >
          הסתיימו
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'active'}
          className={`tab-switch__btn ${tab === 'active' ? 'tab-switch__btn--active' : ''}`}
          onClick={() => setTab('active')}
        >
          פעילים
        </button>
      </div>

      {list.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} onDetails={() => navigate(`/app/challenges/${challenge.id}`)} />
      ))}

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
