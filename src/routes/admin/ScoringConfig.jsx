import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const FIELDS = [
  { goalKey: 'steps_goal', weightKey: 'steps_weight', label: 'צעדים', goalUnit: 'צעדים ליום' },
  { goalKey: 'active_minutes_goal', weightKey: 'active_minutes_weight', label: 'דקות פעילות', goalUnit: 'דקות ליום' },
  { goalKey: 'distance_goal_km', weightKey: 'distance_weight', label: 'מרחק', goalUnit: 'ק"מ ליום' },
  { goalKey: 'vigorous_minutes_goal', weightKey: 'vigorous_weight', label: 'פעילות עצימה', goalUnit: 'דקות ליום' },
];

const SLEEP_FIELDS = [
  { key: 'sleepProbabilityThreshold', label: 'סף הסתברות שינה', step: '0.01', hint: '0–1, מעל זה נחשב "ישן"' },
  { key: 'minSleepWindows', label: 'מס׳ חלונות מינ׳ לזיהוי הירדמות', step: '1', hint: `חלונות של 5 דק׳` },
  { key: 'awakeProbabilityThreshold', label: 'סף הסתברות ערות', step: '0.01', hint: '0–1, מעל זה נחשב "ער"' },
  { key: 'minAwakeWindows', label: 'מס׳ חלונות מינ׳ לזיהוי יקיצה', step: '1', hint: 'חלונות של 5 דק׳' },
];

export default function ScoringConfig() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [sleepForm, setSleepForm] = useState(null);
  const [sleepAgeBands, setSleepAgeBands] = useState([]);
  const [sleepSaved, setSleepSaved] = useState(null);
  const [sleepError, setSleepError] = useState('');
  const [sleepBusy, setSleepBusy] = useState(false);

  useEffect(() => {
    api.activityConfig().then(({ config }) => setForm(config));
    api.sleepConfig().then(({ config, ageBands }) => {
      setSleepForm(config);
      setSleepAgeBands(ageBands);
    });
  }, []);

  const updateSleep = (key, value) => setSleepForm((prev) => ({ ...prev, [key]: value }));

  const handleSleepSubmit = async (e) => {
    e.preventDefault();
    setSleepError('');
    setSleepSaved(null);
    setSleepBusy(true);
    try {
      const { config } = await api.updateSleepConfig(sleepForm);
      setSleepForm(config
        ? {
            sleepProbabilityThreshold: Number(config.sleep_probability_threshold),
            minSleepWindows: config.min_sleep_windows,
            windowSizeMinutes: config.window_size_minutes,
            awakeProbabilityThreshold: Number(config.awake_probability_threshold),
            minAwakeWindows: config.min_awake_windows,
          }
        : sleepForm);
      setSleepSaved('הגדרות השינה עודכנו בהצלחה.');
    } catch (err) {
      setSleepError(err.message);
    } finally {
      setSleepBusy(false);
    }
  };

  if (!form) return <div className="admin-page"><p className="admin-table__empty">טוען…</p></div>;

  const weightSum = FIELDS.reduce((sum, f) => sum + Number(form[f.weightKey] || 0), 0);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Math.round(weightSum) !== 100) {
      setError(`סכום המשקלים חייב להיות 100 (כרגע: ${weightSum})`);
      return;
    }
    setError('');
    setSaved(null);
    setBusy(true);
    try {
      const { config } = await api.updateActivityConfig(form);
      setForm(config);
      setSaved('היעדים עודכנו בהצלחה.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">הגדרת ציון פעילות</h1>
      </div>

      <form className="card admin-form" onSubmit={handleSubmit} noValidate>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', lineHeight: 1.6 }}>
          כל שינוי נשמר כגרסה חדשה — הציונים ההיסטוריים לא משתנים, רק הימים החל מהיום.
        </p>

        {FIELDS.map((f) => (
          <div className="field" key={f.goalKey}>
            <label>{f.label}</label>
            <div className="date-range-row">
              <div className="field-suffix-row" style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="text-input"
                  value={form[f.goalKey]}
                  onChange={(e) => update(f.goalKey, Number(e.target.value))}
                  dir="ltr"
                />
                <span className="field-suffix">{f.goalUnit}</span>
              </div>
              <div className="field-suffix-row" style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="text-input"
                  value={form[f.weightKey]}
                  onChange={(e) => update(f.weightKey, Number(e.target.value))}
                  dir="ltr"
                />
                <span className="field-suffix">נק' מקס'</span>
              </div>
            </div>
          </div>
        ))}

        <p style={{ color: weightSum === 100 ? 'var(--ink-soft)' : 'var(--orange-achieve)', fontSize: '0.88rem', fontWeight: 600 }}>
          סכום משקלים: {weightSum} / 100
        </p>

        {error && <p className="form-error">{error}</p>}
        {saved && <p className="forgot-success">{saved}</p>}

        <button type="submit" className="btn-primary admin-form__submit" disabled={busy}>
          {busy ? 'שומרים…' : 'שמור יעדים חדשים'}
        </button>
      </form>

      <div className="admin-page__header" style={{ marginTop: '1.6rem' }}>
        <h1 className="admin-page__title">הגדרת מנוע השינה</h1>
      </div>

      {sleepForm && (
        <form className="card admin-form" onSubmit={handleSleepSubmit} noValidate>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.92rem', lineHeight: 1.6 }}>
            שינה משוערת מבוססת חיישני טלפון בלבד — ראו את התיעוד המלא (README) לפרטי המודל, המגבלות והפרטיות.
          </p>

          {SLEEP_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <div className="field-suffix-row">
                <input
                  type="number"
                  min="0"
                  step={f.step}
                  className="text-input"
                  value={sleepForm[f.key]}
                  onChange={(e) => updateSleep(f.key, Number(e.target.value))}
                  dir="ltr"
                />
                <span className="field-suffix">{f.hint}</span>
              </div>
            </div>
          ))}

          {sleepError && <p className="form-error">{sleepError}</p>}
          {sleepSaved && <p className="forgot-success">{sleepSaved}</p>}

          <button type="submit" className="btn-primary admin-form__submit" disabled={sleepBusy}>
            {sleepBusy ? 'שומרים…' : 'שמור הגדרות שינה'}
          </button>
        </form>
      )}

      {sleepAgeBands.length > 0 && (
        <div className="card admin-form" style={{ marginTop: '1rem' }}>
          <p className="card__label">יעדי שינה לפי גיל</p>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: '0.6rem' }}>
            לצפייה בלבד כרגע — עריכה דורשת שינוי ישיר במסד הנתונים.
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>טווח גילאים</th>
                <th>יעד שינה</th>
              </tr>
            </thead>
            <tbody>
              {sleepAgeBands.map((b) => (
                <tr key={`${b.minAge}-${b.maxAge}`}>
                  <td>{b.minAge}–{b.maxAge}</td>
                  <td>{b.targetMinHours}–{b.targetMaxHours} שעות</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
