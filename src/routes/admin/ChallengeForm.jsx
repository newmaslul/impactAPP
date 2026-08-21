import { useState } from 'react';
import { CHALLENGE_TYPES, CHALLENGE_SCOPES, CHALLENGE_RECURRENCES } from '../../lib/challengeTypes.js';

export default function ChallengeForm({ onCancel, onSubmit }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('steps');
  const [scope, setScope] = useState('personal');
  const [recurrence, setRecurrence] = useState('once');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [boundUntil, setBoundUntil] = useState('');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('נדרש שם לאתגר');
    if (recurrence === 'once') {
      if (!start || !end) return setError('נדרשת תקופת אתגר מלאה');
      if (new Date(end) <= new Date(start)) return setError('תאריך הסיום חייב להיות אחרי תאריך ההתחלה');
    }
    if (!goal || Number(goal) <= 0) return setError('נדרש יעד גדול מ-0');

    setError('');
    onSubmit({
      name: name.trim(),
      type,
      scope,
      recurrence,
      goal: Number(goal),
      ...(recurrence === 'once'
        ? { start, end }
        : { recurrenceBoundUntil: boundUntil || null }),
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">צור אתגר</h1>
      </div>

      <form className="card admin-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="challenge-name">שם</label>
          <input
            id="challenge-name"
            type="text"
            className="text-input"
            placeholder="לדוגמה: 30 ימים בתנועה"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>סוג</label>
          <div className="type-grid" role="radiogroup" aria-label="סוג אתגר">
            {CHALLENGE_TYPES.map((t) => {
              const selected = type === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  role="radio"
                  aria-checked={selected}
                  className={`option-card ${selected ? 'option-card--selected' : ''}`}
                  onClick={() => setType(t.id)}
                >
                  <span className="option-card__icon" aria-hidden="true">{t.icon}</span>
                  <span className="option-card__label">{t.label}</span>
                  <span className="option-card__radio" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label>קהל תחרות</label>
          <div className="checkbox-list" role="radiogroup" aria-label="קהל תחרות">
            {CHALLENGE_SCOPES.map((opt) => (
              <label className="checkbox-row" key={opt.id}>
                <input
                  type="radio"
                  name="challenge-scope"
                  checked={scope === opt.id}
                  onChange={() => setScope(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label>תדירות</label>
          <div className="checkbox-list" role="radiogroup" aria-label="תדירות">
            {CHALLENGE_RECURRENCES.map((opt) => (
              <label className="checkbox-row" key={opt.id}>
                <input
                  type="radio"
                  name="challenge-recurrence"
                  checked={recurrence === opt.id}
                  onChange={() => setRecurrence(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {recurrence === 'once' ? (
          <div className="field">
            <label>תקופה</label>
            <div className="date-range-row">
              <input type="date" className="text-input" value={start} onChange={(e) => setStart(e.target.value)} aria-label="תאריך התחלה" />
              <span className="date-range-row__sep" aria-hidden="true">—</span>
              <input type="date" className="text-input" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="תאריך סיום" />
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="challenge-bound">תחום בזמן עד (לא חובה)</label>
            <input
              id="challenge-bound"
              type="date"
              className="text-input"
              value={boundUntil}
              onChange={(e) => setBoundUntil(e.target.value)}
            />
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: '0.4rem 0 0' }}>
              האתגר מתחדש אוטומטית ({CHALLENGE_RECURRENCES.find((r) => r.id === recurrence)?.label}) ללא הגבלה, אלא אם מוגדר כאן תאריך לעצירה.
            </p>
          </div>
        )}

        <div className="field">
          <label htmlFor="challenge-goal">יעד</label>
          <div className="field-suffix-row">
            <input
              id="challenge-goal"
              type="number"
              min="1"
              className="text-input"
              placeholder="1,000,000"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              dir="ltr"
            />
            <span className="field-suffix">נקודות</span>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="admin-form__actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>ביטול</button>
          <button type="submit" className="btn-primary admin-form__submit">פרסם אתגר</button>
        </div>
      </form>
    </div>
  );
}
