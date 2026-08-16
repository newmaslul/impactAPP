import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber } from '../../lib/format.js';
import { getCurrentUser } from '../../lib/userStore.js';

// Mock data — will come from the user's account + activity history later.
// name falls back to a demo value when no one has registered on this
// device/browser yet (e.g. visiting /app/profile directly).
const DEMO_USER = { name: 'איתי', level: 8, levelProgressPct: 72 };

const BADGES = [
  { icon: '🏅', label: '30 ימים' },
  { icon: '❤️', label: 'משפיע' },
  { icon: '👥', label: 'צוות' },
  { icon: '🔥', label: '10 ימים רצופים' },
];

const STATS = [
  { icon: '👣', value: formatNumber(7420), label: 'צעדים' },
  { icon: '❤️', value: "34 דק'", label: 'פעילות' },
  { icon: '😴', value: '7:18', label: 'שינה' },
  { icon: '⭐', value: formatNumber(4820), label: 'נקודות' },
];

export default function Profile() {
  const currentUser = getCurrentUser();
  const name = currentUser?.username || DEMO_USER.name;
  const { level, levelProgressPct } = DEMO_USER;

  return (
    <div className="home">
      <h1 className="home__greeting">👤 הפרופיל שלי</h1>

      <section className="card">
        <div className="profile-header">
          <span className="profile-header__avatar" aria-hidden="true">{name[0]}</span>
          <div className="profile-header__text">
            <p className="profile-header__name">{name}</p>
            <p className="profile-header__level">
              רמה {level}
              {currentUser?.department && <span className="profile-header__dept"> · {currentUser.department}</span>}
            </p>
          </div>
        </div>
        <div className="profile-header__progress">
          <ProgressBar value={levelProgressPct} tone="achieve" label={`${levelProgressPct}% לרמה ${level + 1}`} />
        </div>
      </section>

      <section className="card">
        <p className="card__label">🏆 ההישגים שלי</p>
        <div className="badge-grid">
          {BADGES.map((b) => (
            <div className="badge-chip" key={b.label}>
              <span className="badge-chip__icon" aria-hidden="true">{b.icon}</span>
              <span className="badge-chip__label">{b.label}</span>
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
        <button type="button" className="btn-ghost">הגדרות</button>
        <button type="button" className="btn-ghost">פרטיות</button>
      </div>
    </div>
  );
}
