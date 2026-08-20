import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';
import { api } from '../../lib/api.js';
import { LEVEL_PILL, Thumbnail } from './Learning.jsx';

export default function LearningDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [justAwarded, setJustAwarded] = useState(null);

  const load = () => {
    setError('');
    setNotFound(false);
    api
      .listContent()
      .then(({ content }) => {
        const found = content.find((c) => String(c.id) === id);
        if (!found) return setNotFound(true);
        setItem(found);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(load, [id]);

  const handleClaim = async () => {
    setClaiming(true);
    setError('');
    try {
      const result = await api.completeContent(item.id);
      setItem((prev) => ({ ...prev, watched: true }));
      if (!result.alreadyWatched) setJustAwarded(result.pointsAwarded);
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="detail-section">
      <SubPageHeader title={item?.title ?? 'למידה'} onBack={() => navigate('/app/learning')} />

      {!item && !notFound && !error && <p className="admin-table__empty">טוען…</p>}
      {notFound && <p className="org-empty">התוכן לא נמצא</p>}

      {error && (
        <div className="card">
          <p className="form-error">לא הצלחנו לטעון את התוכן. {error}</p>
          <button type="button" className="btn-ghost btn-ghost--block" onClick={load}>
            נסו שוב
          </button>
        </div>
      )}

      {item && (
        <>
          <a
            className="learning-detail__hero"
            href={item.videoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="פתח את הסרטון"
          >
            <Thumbnail item={item} />
            <span className="learning-detail__play" aria-hidden="true">
              <span className="learning-detail__play-icon">▶</span>
            </span>
          </a>

          <h1>{item.title}</h1>
          <p className="task-card__subtitle">
            {[item.durationLabel, item.level].filter(Boolean).join(' · ')}
          </p>

          {item.description && (
            <section className="card">
              <p className="task-card__subtitle" style={{ fontSize: '0.98rem' }}>{item.description}</p>
            </section>
          )}

          {item.benefits?.length > 0 && (
            <section className="card">
              <p className="card__label">מה התרגיל כולל</p>
              <ul className="learning-benefits">
                {item.benefits.map((b) => (
                  <li className="learning-benefits__item" key={b}>
                    <span aria-hidden="true">✓</span> {b}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {item.watched ? (
            <span className={`status-pill ${LEVEL_PILL[item.level] ?? 'status-pill--active'}`} style={{ alignSelf: 'flex-start' }}>
              בוצע ✓
            </span>
          ) : (
            <button type="button" className="btn-primary" disabled={claiming} onClick={handleClaim}>
              {claiming ? 'רושמים…' : 'עשיתי את זה! ✅'}
            </button>
          )}

          <span className="points-pill">+{item.pointsReward} XP</span>

          {justAwarded != null && (
            <p className="forgot-success">קיבלת +{justAwarded} XP! 🎉</p>
          )}
        </>
      )}
    </div>
  );
}
