import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber } from '../../lib/format.js';
import { useCurrentUser } from '../../context/CurrentUserContext.jsx';

// Mock data — will come from the user's account + activity history later.
const LEVEL = 8;
const LEVEL_PROGRESS_PCT = 72;

const BADGES = [
  { icon: '🔥', label: '10,000 צעדים ביום', locked: false },
  { icon: '🚶', label: 'ביקורים ברצף', locked: false },
  { icon: '⭐', label: '20,000 צעדים ביום', locked: false },
  { icon: '💪', label: '5 אימונים', locked: false },
  { icon: '💧', label: 'שתיתי 7 ימים מים', locked: false },
  { icon: '🌅', label: 'קמתי מוקדם', locked: false },
  { icon: '🏆', label: '50,000 צעדים ברצף', locked: true },
  { icon: '📅', label: '10 ימים ברצף', locked: true },
  { icon: '🌙', label: '15 אימוני בוקר', locked: true },
];

const STATS = [
  { icon: '👣', value: formatNumber(7420), label: 'צעדים' },
  { icon: '❤️', value: "34 דק'", label: 'פעילות' },
  { icon: '😴', value: '7:18', label: 'שינה' },
  { icon: '⭐', value: formatNumber(4820), label: 'נקודות' },
];

export default function Profile() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  return (
    <div className="home">
      <h1 className="home__greeting">👤 הפרופיל שלי</h1>

      <section className="card">
        <div className="profile-header">
          <span className="profile-header__avatar" aria-hidden="true">{user.username[0]}</span>
          <div className="profile-header__text">
            <p className="profile-header__name">{user.username}</p>
            <p className="profile-header__level">
              רמה {LEVEL}
              {user.department && <span className="profile-header__dept"> · {user.department}</span>}
            </p>
          </div>
        </div>
        <div className="profile-header__progress">
          <ProgressBar value={LEVEL_PROGRESS_PCT} tone="achieve" label={`${LEVEL_PROGRESS_PCT}% לרמה ${LEVEL + 1}`} />
        </div>
      </section>

      <section className="card">
        <p className="card__label">🏆 ההישגים שלי</p>
        <div className="achieve-grid">
          {BADGES.map((b) => (
            <div className={`achieve-badge ${b.locked ? 'achieve-badge--locked' : ''}`} key={b.label}>
              <span className="achieve-badge__circle" aria-hidden="true">
                {b.icon}
                {b.locked && <span className="achieve-badge__lock">🔒</span>}
              </span>
              <span className="achieve-badge__label">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="card__label">הפעילות שלי</p>
        <div className="stat-grid">
          {STATS.map((s) => (
            <div className="stat-tile stat-tile--plain" key={s.label}>
              <span className="stat-tile__icon" aria-hidden="true">{s.icon}</span>
              <p className="stat-tile__value">{s.value}</p>
              <p className="stat-tile__label">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="ghost-row">
        <button type="button" className="btn-ghost" onClick={() => navigate('/app/group')}>👥 קבוצה</button>
        <button type="button" className="btn-ghost" onClick={() => navigate('/app/impact')}>❤️ Impact</button>
        <button type="button" className="btn-ghost">הגדרות</button>
        <button type="button" className="btn-ghost">פרטיות</button>
      </div>
    </div>
  );
}
