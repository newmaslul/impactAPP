import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';

const CATEGORIES = [
  { key: 'all', label: 'הכל' },
  { key: 'workout', label: 'אימונים' },
  { key: 'tip', label: 'טיפים' },
  { key: 'yoga', label: 'יוגה' },
  { key: 'lecture', label: 'הרצאה' },
];

const LEVEL_PILL = {
  קל: 'status-pill--active',
  בינוני: 'status-pill--scheduled',
  קשה: 'status-pill--ended',
};

/** Fallback shown instead of a broken <img> whenever an item has no thumbnail_url. */
function Thumbnail({ item }) {
  if (item.thumbnailUrl) {
    return <img className="learning-card__thumb" src={item.thumbnailUrl} alt="" />;
  }
  return (
    <div className="learning-card__thumb learning-card__thumb--fallback" aria-hidden="true">
      📺
    </div>
  );
}

export default function Learning() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  // Tracked separately from `items` — previously a failed fetch left
  // `items` at its initial `null` forever, which was also the "still
  // loading" signal, so an error showed the error text *and* a stuck
  // "טוען…" spinner underneath it with no way to recover.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .listContent()
      .then(({ content }) => setItems(content))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = (items ?? []).filter((item) => category === 'all' || item.category === category);

  return (
    <div className="home">
      <h1 className="home__greeting">▶️ בוסט וידאו</h1>

      <div className="learning-tabs" role="tablist">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={category === c.key}
            className={`learning-tabs__item ${category === c.key ? 'learning-tabs__item--active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <p className="admin-table__empty">טוען…</p>}

      {!loading && error && (
        <div className="card">
          <p className="form-error">לא הצלחנו לטעון את התכנים. {error}</p>
          <button type="button" className="btn-ghost btn-ghost--block" onClick={load}>
            נסו שוב
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && <p className="org-empty">אין תכנים בקטגוריה הזו כרגע</p>}

      <div className="learning-list">
        {filtered.map((item) => (
          <button
            type="button"
            key={item.id}
            className="card learning-card"
            onClick={() => navigate(`/app/learning/${item.id}`)}
          >
            <div className="learning-card__thumb-wrap">
              <Thumbnail item={item} />
              {(item.durationLabel || item.level) && (
                <span className="learning-card__badge">
                  {[item.durationLabel, item.level].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            <div className="learning-card__body">
              <p className="learning-card__title">{item.title}</p>
              {item.watched && <span className="status-pill status-pill--active">נצפה ✓</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export { CATEGORIES, LEVEL_PILL, Thumbnail };
