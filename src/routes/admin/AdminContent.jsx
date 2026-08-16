import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

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
        <h1 className="admin-page__title">תכנים</h1>
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
                <th>נקודות</th>
                <th>צפיות</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="admin-table__empty">טוען…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="admin-table__empty">אין עדיין תכנים</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="admin-table__name">{item.title}</td>
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('נדרשת כותרת');
    if (!videoUrl.trim()) return setError('נדרש קישור לסרטון');

    setError('');
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), videoUrl: videoUrl.trim(), pointsReward: Number(pointsReward) || 0 });
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
          <input id="content-title" type="text" className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: בטיחות בדרכים" />
        </div>

        <div className="field">
          <label htmlFor="content-desc">תיאור (לא חובה)</label>
          <input id="content-desc" type="text" className="text-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="content-url">קישור לסרטון</label>
          <input id="content-url" type="url" className="text-input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." dir="ltr" />
        </div>

        <div className="field">
          <label htmlFor="content-points">נקודות בסיום צפייה</label>
          <div className="field-suffix-row">
            <input id="content-points" type="number" min="0" className="text-input" value={pointsReward} onChange={(e) => setPointsReward(e.target.value)} dir="ltr" />
            <span className="field-suffix">נקודות</span>
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
