import { useId } from 'react';

/** Circular 0-100 progress ring — used for the composite activity score,
 *  which is a capped/bounded single number, a better fit than the app's
 *  linear ProgressBar (used elsewhere for open-ended goal progress). */
export default function ScoreRing({ value, size = 180, strokeWidth = 14, label }) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--blue-deep)" />
            <stop offset="100%" stopColor="var(--teal-impact)" />
          </linearGradient>
        </defs>
        <circle className="score-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" />
        {value != null && (
          <circle
            className="score-ring__fill"
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
        )}
      </svg>
      <div className="score-ring__center">
        <span className="score-ring__value">{value == null ? '—' : value}</span>
        {label && <span className="score-ring__label">{label}</span>}
      </div>
    </div>
  );
}
