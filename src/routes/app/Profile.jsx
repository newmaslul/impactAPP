import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber } from '../../lib/format.js';

// Mock data — will come from the user's account + activity history later.
const USER = { name: 'איתי', level: 8, levelProgressPct: 72 };

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
  return (
    <div className="home">
      <h1 className="home__greeting">👤 הפרופיל שלי</h1>

      <section className="card">
        <div className="profile-header">
          <span className="profile-header__avatar" aria-hidden="true">{USER.name[0]}</span>
          <div className="profile-header__text">
            <p className="profile-header__name">{USER.name}</p>
            <p className="profile-header__level">רמה {USER.level}</p>
          </div>
        </div>
        <div className="profile-header__progress">
          <ProgressBar value={USER.levelProgressPct} tone="achieve" label={`${USER.levelProgressPct}% לרמה ${USER.level + 1}`} />
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
