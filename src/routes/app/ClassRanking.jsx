import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';
import { formatNumber } from '../../lib/format.js';
import { api } from '../../lib/api.js';

const initial = (name) => name.trim().split(' ').pop()[0];

function PodiumSpot({ entry, place, unit }) {
  const tone = place === 1 ? 'first' : place === 2 ? 'second' : 'third';
  return (
    <div className={`podium__spot podium__spot--${tone}`}>
      {place === 1 && <span className="podium__crown" aria-hidden="true">👑</span>}
      <span className="podium__avatar" aria-hidden="true">{initial(entry.name)}</span>
      <span className="podium__name">{entry.name}</span>
      <span className="podium__points">{formatNumber(entry.value)}{unit ? ` ${unit}` : ''}</span>
      <div className="podium__block">{place}</div>
    </div>
  );
}

/**
 * Ranking for a 'class' or 'cross_grade'-scoped challenge, opened from
 * ChallengeDetail.jsx after it fetches the challenge and finds its scope
 * is group-based. `challengeId` is required — this is no longer a
 * standalone "this week" screen (see the "מנגנון האתגרים" scheme).
 */
export default function ClassRanking({ challengeId, title, scope }) {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState(null);
  const [unit, setUnit] = useState('');
  // Tracked separately from `ranking` — see Learning.jsx for why a
  // failed fetch must not leave the loading state stuck forever.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .classRanking(challengeId)
      .then(({ ranking, unit }) => {
        setRanking(ranking);
        setUnit(unit ?? '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [challengeId]);

  const [first, second, third, ...rest] = ranking ?? [];
  const pageTitle = scope === 'cross_grade' ? 'דירוג בין־שכבתי' : 'דירוג כיתתי';

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
        <p className="org-empty">{scope === 'cross_grade' ? 'אין עדיין שכבות לדירוג' : 'אין עדיין כיתות לדירוג בשכבה שלך'}</p>
      )}

      {!loading && !error && (ranking ?? []).length > 0 && (
        <section className="card">
          <p className="card__label">{title ?? pageTitle}</p>
          {first && (
            <div className="podium">
              {second && <PodiumSpot entry={second} place={2} unit={unit} />}
              <PodiumSpot entry={first} place={1} unit={unit} />
              {third && <PodiumSpot entry={third} place={3} unit={unit} />}
            </div>
          )}
          <div className="rank-list">
            {rest.map((entry, i) => (
              <div className="rank-row" key={entry.id}>
                <span className="rank-row__place">{i + 4}</span>
                <span className="rank-row__avatar" aria-hidden="true">{initial(entry.name)}</span>
                <span className="rank-row__name">{entry.name}</span>
                <span className="rank-row__points">{formatNumber(entry.value)}{unit ? ` ${unit}` : ''}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
