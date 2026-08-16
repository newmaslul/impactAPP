import { useState } from 'react';
import ChallengeForm from './ChallengeForm.jsx';
import { formatNumber } from '../../lib/format.js';

const TYPES = [
  { id: 'steps', label: 'צעדים', icon: '👣' },
  { id: 'activity', label: 'פעילות', icon: '🏃' },
  { id: 'sleep', label: 'שינה', icon: '😴' },
  { id: 'team', label: 'צוות', icon: '👥' },
  { id: 'impact', label: 'Impact', icon: '❤️' },
  { id: 'community', label: 'קהילה', icon: '🏘️' },
];

const SCORING = [
  { label: 'פעילות', weight: 30 },
  { label: 'עקביות', weight: 25 },
  { label: 'השתתפות', weight: 20 },
  { label: 'פעילות קבוצתית', weight: 15 },
  { label: 'Impact', weight: 10 },
];

const INITIAL_CHALLENGES = [
  { id: 1, name: '30 ימים בתנועה', type: 'steps', start: '2026-08-01', end: '2026-08-30', goal: 1_000_000, status: 'active' },
  { id: 2, name: 'אתגר מחלקות Q3', type: 'team', start: '2026-07-01', end: '2026-07-31', goal: 500_000, status: 'ended' },
];

function typeMeta(id) {
  return TYPES.find((t) => t.id === id) ?? TYPES[0];
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
  const [challenges, setChallenges] = useState(INITIAL_CHALLENGES);
  const [view, setView] = useState('list'); // 'list' | 'create'

  const handleCreate = (challenge) => {
    const today = new Date().toISOString().slice(0, 10);
    const status = challenge.start > today ? 'scheduled' : 'active';
    setChallenges((prev) => [{ ...challenge, id: Date.now(), status }, ...prev]);
    setView('list');
  };

  if (view === 'create') {
    return <ChallengeForm onCancel={() => setView('list')} onSubmit={handleCreate} />;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">אתגרים</h1>
        <button type="button" className="btn-primary admin-page__header-cta" onClick={() => setView('create')}>
          + צור אתגר
        </button>
      </div>

      <section className="card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>סוג</th>
                <th>תקופה</th>
                <th>יעד</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((c) => {
                const t = typeMeta(c.type);
                return (
                  <tr key={c.id}>
                    <td className="admin-table__name">{c.name}</td>
                    <td>
                      <span aria-hidden="true">{t.icon}</span> {t.label}
                    </td>
                    <td className="admin-table__points">{formatDate(c.start)} — {formatDate(c.end)}</td>
                    <td className="admin-table__points">{formatNumber(c.goal)} נק'</td>
                    <td>
                      <span className={`status-pill status-pill--${c.status}`}>{statusLabel(c.status)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
