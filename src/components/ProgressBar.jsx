/**
 * Shared progress bar — used for step goals, team point goals, challenge
 * progress, etc. `tone` picks the fill: "brand" (default, blue→teal) for
 * ordinary progress, "achieve" for reward/points progress (the one place
 * orange is allowed per the design language in PRODUCT_SPEC.md §14).
 */
export default function ProgressBar({ value, tone = 'brand', label }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`progressbar progressbar--${tone}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="progressbar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
