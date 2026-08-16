import { useNavigate } from 'react-router-dom';
import ProgressBar from '../../components/ProgressBar.jsx';
import { formatNumber, formatCompact } from '../../lib/format.js';

// Mock data — this is the screen the spec calls out as one of the most
// important in the product, so the funding goal + "what we created" figures
// stand in for what will come from the org's real impact ledger.
const FUND = { current: 38420, goal: 50000 };
const CREATED = [
  { icon: '🚶', n: 12_400_000, compact: true, label: 'צעדים' },
  { icon: '🏃', n: 8400, label: 'שעות פעילות' },
  { icon: '🤝', n: 1240, label: 'שעות התנדבות' },
  { icon: '👥', n: 742, label: 'משתתפים' },
];
const NEXT_PROJECT = 'פרויקט ספורט קהילתי';

export default function Impact() {
  const navigate = useNavigate();
  const remaining = FUND.goal - FUND.current;
  const pct = Math.round((FUND.current / FUND.goal) * 100);

  return (
    <div className="home">
      <h1 className="home__greeting">❤️ ההשפעה שלנו</h1>

      <section className="card card--hero">
        <p className="stat-big">
          {formatNumber(FUND.current)}
          <span className="stat-big__unit">₪</span>
        </p>
        <p className="card__meta" style={{ marginTop: '-0.6rem', marginBottom: '0.9rem' }}>ערך שנוצר לקהילה</p>
        <ProgressBar value={pct} tone="impact" label={`${pct}% מהיעד`} />
        <p className="card__meta">{pct}% &nbsp;·&nbsp; יעד: {formatNumber(FUND.goal)} ₪</p>
      </section>

      <section className="card">
        <p className="card__label">מה יצרנו?</p>
        <div className="stat-row-list">
          {CREATED.map((s) => (
            <div className="stat-row" key={s.label}>
              <span className="stat-row__icon" aria-hidden="true">{s.icon}</span>
              <span className="stat-row__value">{s.compact ? formatCompact(s.n) : formatNumber(s.n)}</span>
              <span className="stat-row__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card card--cta">
        <p className="card--cta__remaining">עוד {formatNumber(remaining)} ₪</p>
        <p className="card--cta__copy">ואנחנו מממנים {NEXT_PROJECT}</p>
        <button type="button" className="btn-primary" onClick={() => navigate('/app/impact/vote')}>
          בחרו את הפרויקט
        </button>
      </section>
    </div>
  );
}
