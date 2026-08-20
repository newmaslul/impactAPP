import ProgressBar from './ProgressBar.jsx';

/** "הרמה שלי" card — a shield/crown badge, the current level's title, and
 *  progress toward the next level. Shared by Home and Achievements so the
 *  same level concept reads consistently in both places. */
export default function LevelBadgeCard({ levelTitle, progressPct, caption }) {
  return (
    <section className="card level-badge-card">
      <div className="level-badge-card__row">
        <span className="level-badge-card__shield" aria-hidden="true">
          🛡️
          <span className="level-badge-card__crown">👑</span>
        </span>
        <div className="level-badge-card__text">
          <p className="level-badge-card__label">הרמה שלי</p>
          <p className="level-badge-card__title">{levelTitle}</p>
        </div>
        <span className="level-badge-card__star" aria-hidden="true">⭐</span>
      </div>
      <ProgressBar value={progressPct} tone="achieve" label={`${progressPct}% לרמה הבאה`} />
      {caption && <p className="level-badge-card__caption">{caption}</p>}
    </section>
  );
}
