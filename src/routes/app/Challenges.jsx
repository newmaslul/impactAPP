import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber } from '../../lib/format.js';

// Mock data — will come from the backend once challenges are configurable (§12).
// Order: יומי, שבועי, כיתתי — per explicit request, not the order these
// happen to be keyed/defined in.
const ACTIVE_CHALLENGES = [
  {
    id: 'daily-goal',
    icon: '🎯',
    title: 'אתגר יומי',
    subtitle: 'הליכה של 10,000 צעדים',
    current: 10000,
    goal: 10000,
    done: true,
  },
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
    title: 'אתגר כיתתי',
    subtitle: 'הכיתה שהולכת הכי הרבה',
    current: 7450, // same numbers Home's CLASS_CHALLENGE_PREVIEW already shows for this id
    goal: 20000,
    daysLeft: 2,
  },
];

const COMPLETED_CHALLENGES = [
  { id: 'last-month', icon: '✅', title: 'אתגר החודש שעבר', subtitle: '400,000 צעדים כקבוצה', points: 800 },
];

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
    </div>
  );
}
