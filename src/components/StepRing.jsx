import { useId } from 'react';

/** Circular ring for the Home hero card — unlike ScoreRing (which shows a
 *  capped 0-100 score as both the fill % and the label), this one shows an
 *  open-ended raw number (steps) while the fill % is driven separately by
 *  progress toward the daily goal. */
export default function StepRing({ value, pct, size = 200, strokeWidth = 16, label, icon }) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(100, pct ?? 0));
  const offset = circumference * (1 - clampedPct / 100);

  return (
    <div className="step-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--blue-deep)" />
            <stop offset="100%" stopColor="var(--teal-impact)" />
          </linearGradient>
        </defs>
        <circle className="step-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" />
        <circle
          className="step-ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="step-ring__center">
        {icon && <span className="step-ring__icon" aria-hidden="true">{icon}</span>}
        <span className="step-ring__value">{value.toLocaleString('he-IL')}</span>
        {label && <span className="step-ring__label">{label}</span>}
      </div>
    </div>
  );
}
