import { useState } from 'react';

const TYPES = [
  { id: 'steps', label: 'צעדים', icon: '👣' },
  { id: 'activity', label: 'פעילות', icon: '🏃' },
  { id: 'sleep', label: 'שינה', icon: '😴' },
  { id: 'team', label: 'צוות', icon: '👥' },
  { id: 'impact', label: 'Impact', icon: '❤️' },
  { id: 'community', label: 'קהילה', icon: '🏘️' },
];

const AUDIENCE_OPTIONS = [
  { id: 'company', label: 'כל החברה' },
  { id: 'departments', label: 'מחלקות' },
  { id: 'groups', label: 'קבוצות נבחרות' },
];

export default function ChallengeForm({ onCancel, onSubmit }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('steps');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [goal, setGoal] = useState('');
  const [reward, setReward] = useState('');
  const [audience, setAudience] = useState(['company']);
  const [error, setError] = useState('');

  const toggleAudience = (id) => {
    setAudience((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('נדרש שם לאתגר');
    if (!start || !end) return setError('נדרשת תקופת אתגר מלאה');
    if (new Date(end) <= new Date(start)) return setError('תאריך הסיום חייב להיות אחרי תאריך ההתחלה');
    if (!goal || Number(goal) <= 0) return setError('נדרש יעד גדול מ-0');
    if (audience.length === 0) return setError('נדרשת לפחות קבוצת יעד אחת');

    setError('');
    onSubmit({ name: name.trim(), type, start, end, goal: Number(goal), reward: Number(reward) || 0, audience });
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
            {TYPES.map((t) => {
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
          <label>תקופה</label>
          <div className="date-range-row">
            <input type="date" className="text-input" value={start} onChange={(e) => setStart(e.target.value)} aria-label="תאריך התחלה" />
            <span className="date-range-row__sep" aria-hidden="true">—</span>
            <input type="date" className="text-input" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="תאריך סיום" />
          </div>
        </div>

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

        <div className="field">
          <label htmlFor="challenge-reward">פרס</label>
          <div className="field-suffix-row">
            <input
              id="challenge-reward"
              type="number"
              min="0"
              className="text-input"
              placeholder="20,000"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              dir="ltr"
            />
            <span className="field-suffix">₪ לקהילה</span>
          </div>
        </div>

        <div className="field">
          <label>קבוצות</label>
          <div className="checkbox-list">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label className="checkbox-row" key={opt.id}>
                <input
                  type="checkbox"
                  checked={audience.includes(opt.id)}
                  onChange={() => toggleAudience(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
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
