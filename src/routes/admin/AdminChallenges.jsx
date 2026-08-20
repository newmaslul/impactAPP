import { useEffect, useState } from 'react';
import ChallengeForm from './ChallengeForm.jsx';
import { challengeTypeMeta } from '../../lib/challengeTypes.js';
import { formatNumber } from '../../lib/format.js';
import { api } from '../../lib/api.js';

const SCORING = [
  { label: 'פעילות', weight: 30 },
  { label: 'עקביות', weight: 25 },
  { label: 'השתתפות', weight: 20 },
  { label: 'פעילות קבוצתית', weight: 15 },
  { label: 'Impact', weight: 10 },
];

// Status is derived from the dates every render rather than trusted from
// a stored value — a challenge that was 'active' when created is 'ended'
// by the time an admin looks at this list a month later.
function statusFor(c, today) {
  if (c.end_date < today) return 'ended';
  if (c.start_date > today) return 'scheduled';
  return 'active';
}

function statusLabel(status) {
  if (status === 'active') return 'פעיל';
  if (status === 'scheduled') return 'מתוזמן';
  return 'הסתיים';
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export default function AdminChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'create'

  const load = () => {
    setLoading(true);
    setError('');
    api
      .adminListChallenges()
      .then(({ challenges }) => setChallenges(challenges))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (challenge) => {
    try {
      await api.adminCreateChallenge(challenge);
      setView('list');
      load();
    } catch (err) {
      setError(err.message);
      setView('list');
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.adminDeleteChallenge(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (view === 'create') {
    return <ChallengeForm onCancel={() => setView('list')} onSubmit={handleCreate} />;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">אתגרים</h1>
        <button type="button" className="btn-primary admin-page__header-cta" onClick={() => setView('create')}>
          + צור אתגר
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <section className="card">
        {loading && <p className="admin-table__empty">טוען…</p>}
        {!loading && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>שם</th>
                  <th>סוג</th>
                  <th>שכבה</th>
                  <th>תקופה</th>
                  <th>יעד</th>
                  <th>סטטוס</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((c) => {
                  const t = challengeTypeMeta(c.type);
                  const status = statusFor(c, today);
                  return (
                    <tr key={c.id}>
                      <td className="admin-table__name">{c.name}</td>
                      <td>
                        <span aria-hidden="true">{t.icon}</span> {t.label}
                      </td>
                      <td>{c.audience?.includes('grade') ? '✓' : '—'}</td>
                      <td className="admin-table__points">{formatDate(c.start_date)} — {formatDate(c.end_date)}</td>
                      <td className="admin-table__points">{formatNumber(c.goal)}</td>
                      <td>
                        <span className={`status-pill status-pill--${status}`}>{statusLabel(status)}</span>
                      </td>
                      <td><button type="button" className="link-btn link-btn--danger" onClick={() => handleRemove(c.id)}>הסר</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <p className="card__label">מערכת הניקוד</p>
        <div className="scoring-list">
          {SCORING.map((s) => (
            <div className="scoring-row" key={s.label}>
              <span className="scoring-row__label">{s.label}</span>
              <span className="scoring-row__bar">
                <span className="scoring-row__fill" style={{ width: `${s.weight}%` }} />
              </span>
              <span className="scoring-row__weight">{s.weight}%</span>
            </div>
          ))}
        </div>
        <p className="scoring-note">כך לא נוצרת תחרות שבה רק הספורטאים החזקים יכולים לנצח.</p>
      </section>
    </div>
  );
}
