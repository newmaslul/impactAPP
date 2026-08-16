import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber, formatCompact } from '../../lib/format.js';

// Mock data — will come from the org's team/points backend later.
const TEAM = { name: 'מחלקת שיווק', points: 84240, goal: 100000 };

const WEEKLY_STATS = [
  { icon: '🚶', n: 1_200_000, compact: true, label: 'צעדים' },
  { icon: '🏃', n: 4280, label: 'שעות פעילות' },
  { icon: '🤝', n: 182, label: 'משימות' },
  { icon: '❤️', n: 3200, label: 'נקודות Impact' },
];

// Bar lengths as given in the wireframe, normalized to the longest bar.
const MEMBERS = [
  { name: 'איתי', pct: 89 },
  { name: 'דנה', pct: 67 },
  { name: 'יובל', pct: 100 },
  { name: 'רון', pct: 56 },
];

export default function Group() {
  const goalPct = (TEAM.points / TEAM.goal) * 100;

  return (
    <div className="home">
      <h1 className="home__greeting">הקבוצה שלי</h1>

      <section className="card card--hero">
        <p className="card__label">{TEAM.name}</p>
        <p className="stat-big">
          {formatNumber(TEAM.points)}
          <span className="stat-big__unit">נקודות</span>
        </p>
        <ProgressBar value={goalPct} label={`${Math.round(goalPct)}% מהיעד`} />
        <p className="card__meta">היעד: {formatNumber(TEAM.goal)}</p>
      </section>

      <section className="card">
        <p className="card__label">השבוע שלנו</p>
        <div className="stat-row-list">
          {WEEKLY_STATS.map((s) => (
            <div className="stat-row" key={s.label}>
              <span className="stat-row__icon" aria-hidden="true">{s.icon}</span>
              <span className="stat-row__value">{s.compact ? formatCompact(s.n) : formatNumber(s.n)}</span>
              <span className="stat-row__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="card__label">חברי הקבוצה</p>
        <div className="member-list">
          {MEMBERS.map((m) => (
            <div className="member-row" key={m.name}>
              <span className="member-row__name">{m.name}</span>
              <span className="member-row__bar">
                <ProgressBar value={m.pct} label={`${m.name}: ${m.pct}%`} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="privacy-note">
        <span aria-hidden="true">🔒</span>
        לא מוצגים נתוני דופק או שינה אישיים של עובדים.
      </p>
    </div>
  );
}
