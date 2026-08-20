import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber } from '../../lib/format.js';
import { api } from '../../lib/api.js';

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
  const [data, setData] = useState({ active: [], completed: [] });
  // Tracked separately from `data` — see Learning.jsx for why a failed
  // fetch must not leave the loading state stuck forever.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .listChallenges()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const list = tab === 'active' ? data.active : data.completed;

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

      {loading && <p className="admin-table__empty">טוען…</p>}

      {!loading && error && (
        <div className="card">
          <p className="form-error">לא הצלחנו לטעון את האתגרים. {error}</p>
          <button type="button" className="btn-ghost btn-ghost--block" onClick={load}>
            נסו שוב
          </button>
        </div>
      )}

      {!loading && !error && list.length === 0 && (
        <p className="org-empty">{tab === 'active' ? 'אין כרגע אתגרים פעילים' : 'עוד לא הסתיימו אתגרים'}</p>
      )}

      {!loading && !error &&
        list.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} onDetails={() => navigate(`/app/challenges/${challenge.id}`)} />
        ))}
    </div>
  );
}
