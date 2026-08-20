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

// Weekly class/group ranking — sorted high to low, as given in the wireframe.
const RANKING = [
  { name: 'הקבוצה של להן', points: 98450 },
  { name: 'הקבוצה של פרועה', points: 87230 },
  { name: 'הקבוצה של יעבל', points: 76890 },
  { name: 'הקבוצה של דנה', points: 65430 },
  { name: 'הקבוצה של מאי', points: 58210 },
  { name: 'הקבוצה של אורי', points: 45670 },
];

const initial = (name) => name.trim().split(' ').pop()[0];

function PodiumSpot({ entry, place }) {
  const tone = place === 1 ? 'first' : place === 2 ? 'second' : 'third';
  return (
    <div className={`podium__spot podium__spot--${tone}`}>
      {place === 1 && <span className="podium__crown" aria-hidden="true">👑</span>}
      <span className="podium__avatar" aria-hidden="true">{initial(entry.name)}</span>
      <span className="podium__name">{entry.name}</span>
      <span className="podium__points">{formatNumber(entry.points)}</span>
      <div className="podium__block">{place}</div>
    </div>
  );
}

export default function Group() {
  const goalPct = (TEAM.points / TEAM.goal) * 100;
  const [first, second, third, ...rest] = RANKING;

  return (
    <div className="home">
      <h1 className="home__greeting">דירוג הקבוצה שלי</h1>

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
        <p className="card__label">🏅 דירוג השבוע</p>
        <div className="podium">
          <PodiumSpot entry={second} place={2} />
          <PodiumSpot entry={first} place={1} />
          <PodiumSpot entry={third} place={3} />
        </div>
        <div className="rank-list">
          {rest.map((entry, i) => (
            <div className="rank-row" key={entry.name}>
              <span className="rank-row__place">{i + 4}</span>
              <span className="rank-row__avatar" aria-hidden="true">{initial(entry.name)}</span>
              <span className="rank-row__name">{entry.name}</span>
              <span className="rank-row__points">{formatNumber(entry.points)}</span>
            </div>
          ))}
        </div>
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

      <p className="privacy-note">
        <span aria-hidden="true">🔒</span>
        לא מוצגים נתוני דופק או שינה אישיים של עובדים.
      </p>
    </div>
  );
}
