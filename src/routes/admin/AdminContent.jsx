import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const CATEGORIES = [
  { value: 'workout', label: 'אימונים' },
  { value: 'tip', label: 'טיפים' },
  { value: 'yoga', label: 'יוגה' },
  { value: 'lecture', label: 'הרצאה' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const LEVELS = ['קל', 'בינוני', 'קשה'];

export default function AdminContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'create'

  const load = () => {
    setLoading(true);
    api.adminListContent().then(({ content }) => setItems(content)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (payload) => {
    await api.adminCreateContent(payload);
    setView('list');
    load();
  };

  const handleToggleActive = async (item) => {
    await api.adminUpdateContent(item.id, { active: !item.active });
    load();
  };

  const handleDelete = async (id) => {
    await api.adminDeleteContent(id);
    load();
  };

  if (view === 'create') {
    return <ContentForm onCancel={() => setView('list')} onSubmit={handleCreate} />;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">תכנים (למידה)</h1>
        <button type="button" className="btn-primary admin-page__header-cta" onClick={() => setView('create')}>
          + הוסף תוכן
        </button>
      </div>

      <section className="card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>קטגוריה</th>
                <th>נקודות</th>
                <th>צפיות</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="admin-table__empty">טוען…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="admin-table__empty">אין עדיין תכנים</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="admin-table__name">{item.title}</td>
                    <td>{CATEGORY_LABEL[item.category] ?? item.category}</td>
                    <td className="admin-table__points">{item.pointsReward}</td>
                    <td className="admin-table__points">{item.viewCount}</td>
                    <td>
                      <span className={`status-pill ${item.active ? 'status-pill--active' : 'status-pill--ended'}`}>
                        {item.active ? 'פעיל' : 'מוסתר'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.8rem' }}>
                      <button type="button" className="link-btn" onClick={() => handleToggleActive(item)}>
                        {item.active ? 'הסתר' : 'הפעל'}
                      </button>
                      <button type="button" className="link-btn link-btn--danger" onClick={() => handleDelete(item.id)}>
                        מחק
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ContentForm({ onCancel, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pointsReward, setPointsReward] = useState('50');
  const [category, setCategory] = useState('workout');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [durationLabel, setDurationLabel] = useState('');
  const [level, setLevel] = useState('קל');
  const [benefitsText, setBenefitsText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('נדרשת כותרת');
    if (!videoUrl.trim()) return setError('נדרש קישור לסרטון');

    setError('');
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUrl.trim(),
        pointsReward: Number(pointsReward) || 0,
        category,
        thumbnailUrl: thumbnailUrl.trim(),
        durationLabel: durationLabel.trim(),
        level,
        benefits: benefitsText
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">הוסף תוכן</h1>
      </div>

      <form className="card admin-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="content-title">כותרת</label>
          <input id="content-title" type="text" className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: אימון כיף 5 דקות" />
        </div>

        <div className="field">
          <label htmlFor="content-desc">תיאור (לא חובה)</label>
          <input id="content-desc" type="text" className="text-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="content-category">קטגוריה</label>
          <select id="content-category" className="text-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="content-url">קישור לסרטון</label>
          <input id="content-url" type="url" className="text-input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." dir="ltr" />
        </div>

        <div className="field">
          <label htmlFor="content-thumb">קישור לתמונה ממוזערת (לא חובה)</label>
          <input id="content-thumb" type="url" className="text-input" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." dir="ltr" />
        </div>

        <div className="date-range-row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="content-duration">משך (לא חובה)</label>
            <input id="content-duration" type="text" className="text-input" value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} placeholder="לדוגמה: 5 דקות" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="content-level">רמת קושי</label>
            <select id="content-level" className="text-input" value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="content-benefits">יתרונות, מופרדים בפסיק (לא חובה)</label>
          <input
            id="content-benefits"
            type="text"
            className="text-input"
            value={benefitsText}
            onChange={(e) => setBenefitsText(e.target.value)}
            placeholder="לדוגמה: אנרגיה, חיזוק הגוף, שיפור מצב הרוח"
          />
        </div>

        <div className="field">
          <label htmlFor="content-points">נקודות (XP) בסיום</label>
          <div className="field-suffix-row">
            <input id="content-points" type="number" min="0" className="text-input" value={pointsReward} onChange={(e) => setPointsReward(e.target.value)} dir="ltr" />
            <span className="field-suffix">XP</span>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="admin-form__actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>ביטול</button>
          <button type="submit" className="btn-primary admin-form__submit" disabled={busy}>
            {busy ? 'שומרים…' : 'פרסם תוכן'}
          </button>
        </div>
      </form>
    </div>
  );
}
