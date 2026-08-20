import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';
import { formatNumber } from '../../lib/format.js';
import { api } from '../../lib/api.js';

const initial = (name) => name.trim().split(' ').pop()[0];

function PodiumSpot({ entry, place }) {
  const tone = place === 1 ? 'first' : place === 2 ? 'second' : 'third';
  return (
    <div className={`podium__spot podium__spot--${tone}`}>
      {place === 1 && <span className="podium__crown" aria-hidden="true">👑</span>}
      <span className="podium__avatar" aria-hidden="true">{initial(entry.name)}</span>
      <span className="podium__name">{entry.name}</span>
      <span className="podium__points">{formatNumber(entry.steps)}</span>
      <div className="podium__block">{place}</div>
    </div>
  );
}

/**
 * Ranking for a 'class' or 'grade'-typed challenge (see ChallengeDetail.jsx,
 * which passes `challengeId`/`title`/`type` after fetching the challenge).
 * `challengeId` is optional — without it this falls back to its original
 * standalone behavior (every class, current calendar week).
 */
export default function ClassRanking({ challengeId, title, type }) {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState(null);
  // Tracked separately from `ranking` — see Learning.jsx for why a
  // failed fetch must not leave the loading state stuck forever.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .classRanking(challengeId)
      .then(({ ranking }) => setRanking(ranking))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [challengeId]);

  const [first, second, third, ...rest] = ranking ?? [];
  const pageTitle = type === 'grade' ? 'דירוג שכבתי' : 'דירוג כיתתי';

  return (
    <div className="detail-section">
      <SubPageHeader title={pageTitle} onBack={() => navigate('/app/challenges')} />

      {loading && <p className="admin-table__empty">טוען…</p>}

      {!loading && error && (
        <div className="card">
          <p className="form-error">לא הצלחנו לטעון את הדירוג. {error}</p>
          <button type="button" className="btn-ghost btn-ghost--block" onClick={load}>
            נסו שוב
          </button>
        </div>
      )}

      {!loading && !error && (ranking ?? []).length === 0 && (
        <p className="org-empty">{type === 'grade' ? 'אין עדיין שכבות לדירוג' : 'אין עדיין כיתות לדירוג'}</p>
      )}

      {!loading && !error && (ranking ?? []).length > 0 && (
        <section className="card">
          <p className="card__label">{title ?? pageTitle}</p>
          {first && (
            <div className="podium">
              {second && <PodiumSpot entry={second} place={2} />}
              <PodiumSpot entry={first} place={1} />
              {third && <PodiumSpot entry={third} place={3} />}
            </div>
          )}
          <div className="rank-list">
            {rest.map((entry, i) => (
              <div className="rank-row" key={entry.id}>
                <span className="rank-row__place">{i + 4}</span>
                <span className="rank-row__avatar" aria-hidden="true">{initial(entry.name)}</span>
                <span className="rank-row__name">{entry.name}</span>
                <span className="rank-row__points">{formatNumber(entry.steps)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
