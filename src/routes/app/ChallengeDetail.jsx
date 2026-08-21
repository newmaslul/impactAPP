import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';
import ClassRanking from './ClassRanking.jsx';
import { formatNumber } from '../../lib/format.js';
import { api } from '../../lib/api.js';

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export default function ChallengeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [challenge, setChallenge] = useState(null);
  // Tracked separately from `challenge` — see Learning.jsx for why a
  // failed fetch must not leave the loading state stuck forever.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .getChallenge(id)
      .then(({ challenge }) => setChallenge(challenge))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) {
    return (
      <div className="detail-section">
        <SubPageHeader title="פירוט אתגר" onBack={() => navigate('/app/challenges')} />
        <p className="admin-table__empty">טוען…</p>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="detail-section">
        <SubPageHeader title="פירוט אתגר" onBack={() => navigate('/app/challenges')} />
        <div className="card">
          <p className="form-error">{error || 'האתגר לא נמצא'}</p>
          <button type="button" className="btn-ghost btn-ghost--block" onClick={load}>
            נסו שוב
          </button>
        </div>
      </div>
    );
  }

  // A class/cross_grade-scoped challenge is scored by a group total, not
  // the individual's own progress — its "פרטים" screen is the ranking,
  // not a personal progress card.
  if (challenge.scope === 'class' || challenge.scope === 'cross_grade') {
    return <ClassRanking challengeId={id} title={challenge.title} scope={challenge.scope} />;
  }

  const pct = challenge.goal ? Math.round((challenge.current / challenge.goal) * 100) : 0;

  return (
    <div className="detail-section">
      <SubPageHeader title="פירוט אתגר" onBack={() => navigate('/app/challenges')} />

      <h1>
        <span aria-hidden="true">{challenge.icon}</span> {challenge.title}
      </h1>

      <section className="card">
        <p className="card__label">מטרה</p>
        <p className="task-card__subtitle" style={{ fontSize: '0.98rem' }}>{challenge.subtitle}</p>
        <p className="card__meta">{formatDate(challenge.startDate)} — {formatDate(challenge.endDate)}</p>
      </section>

      <section className="card">
        <p className="card__label">התקדמות</p>
        <p className="card__meta card__meta--emphasis">
          {formatNumber(challenge.current)} <span>/ {formatNumber(challenge.goal)}</span>
        </p>
        <div style={{ marginTop: '0.5rem' }}>
          <ProgressBar value={pct} label={`${formatNumber(challenge.current)} מתוך ${formatNumber(challenge.goal)}`} />
        </div>
      </section>

      {challenge.status === 'ended' && (
        <p className="challenge-card__done" style={{ textAlign: 'center' }}>
          {pct >= 100 ? 'האתגר הושלם ✓' : 'האתגר הסתיים'}
        </p>
      )}

      <button type="button" className="btn-primary" onClick={() => navigate('/app/challenges')}>
        המשך
      </button>
    </div>
  );
}
