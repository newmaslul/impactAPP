import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';
import { api } from '../../lib/api.js';

export default function StudentContent() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState(null);
  const [justAwarded, setJustAwarded] = useState(null); // { id, points }

  const load = () => {
    api.listContent().then(({ content }) => setContent(content)).catch((err) => setError(err.message));
  };
  const setContent = (content) => setItems(content);

  useEffect(load, []);

  const handleClaim = async (item) => {
    setClaimingId(item.id);
    setError('');
    try {
      const result = await api.completeContent(item.id);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, watched: true } : i)));
      if (!result.alreadyWatched) {
        setJustAwarded({ id: item.id, points: result.pointsAwarded });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="detail-section">
      <SubPageHeader title="תכנים" onBack={() => navigate('/app/home')} />

      {error && <p className="form-error">{error}</p>}

      {items === null && <p className="admin-table__empty">טוען…</p>}
      {items?.length === 0 && <p className="org-empty">אין תכנים זמינים כרגע</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(items ?? []).map((item) => (
          <section className="card" key={item.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem' }}>
              <div style={{ flex: 1 }}>
                <p className="task-card__title">{item.title}</p>
                {item.description && <p className="task-card__subtitle">{item.description}</p>}
              </div>
              <span className="points-pill">+{item.pointsReward} נק'</span>
            </div>

            <div className="task-card__footer">
              <a href={item.videoUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-ghost--block">
                📺 פתח את הסרטון
              </a>
              {item.watched ? (
                <span className="status-pill status-pill--active" style={{ alignSelf: 'center' }}>נצפה ✓</span>
              ) : (
                <button
                  type="button"
                  className="btn-primary task-card__cta"
                  disabled={claimingId === item.id}
                  onClick={() => handleClaim(item)}
                >
                  {claimingId === item.id ? 'רושמים…' : 'צפיתי, קבל נקודות'}
                </button>
              )}
            </div>

            {justAwarded?.id === item.id && (
              <p className="forgot-success" style={{ marginTop: '0.9rem' }}>
                קיבלת +{justAwarded.points} נקודות! 🎉
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
