import LevelBadgeCard from '../../components/LevelBadgeCard.jsx';

// Mirrors Profile.jsx's own badge list/style (same achieve-grid/
// achieve-badge classes, same locked-state convention) — kept as its own
// copy rather than importing from Profile.jsx, since Profile.jsx is a
// screen component, not a shared data module, and duplicating a short
// mock array is simpler and safer than refactoring that file's own
// in-progress content just to share it.
const LEVEL_TITLE = 'שחקן מתמיד';
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

export default function Achievements() {
  return (
    <div className="home">
      <h1 className="home__greeting">🥇 ההישגים שלי</h1>

      <LevelBadgeCard levelTitle={LEVEL_TITLE} progressPct={LEVEL_PROGRESS_PCT} caption="כל צעד מקרב אותך למטרה!" />

      <section className="card">
        <p className="card__label">🏆 התגים שלי</p>
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
    </div>
  );
}
