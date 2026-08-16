import { useId, useMemo, useState } from 'react';

const WIDTH = 640;
const HEIGHT = 200;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_X = 8;

/**
 * Minimal single-series trend line (area + line, one hue — this is a
 * magnitude-over-time series, not a categorical comparison, so it doesn't
 * need a legend or a multi-hue palette per the dataviz method). Ships with
 * a hover crosshair+tooltip and a plain-table fallback view.
 */
export default function TrendChart({ data, formatValue = (n) => String(n), unitLabel }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const { points, min, max, gridLines } = useMemo(() => {
    const values = data.map((d) => d.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    // Give the line breathing room instead of touching the frame edges.
    const span = dataMax - dataMin || 1;
    const min = dataMin - span * 0.15;
    const max = dataMax + span * 0.15;

    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const points = data.map((d, i) => ({
      ...d,
      x: PAD_X + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: PAD_TOP + innerH - ((d.value - min) / (max - min)) * innerH,
    }));

    const gridLines = Array.from({ length: 4 }, (_, i) => {
      const value = min + ((max - min) * i) / 3;
      const y = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * (1 - i / 3);
      return { value, y };
    });

    return { points, min, max, gridLines };
  }, [data]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L ${points[0].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`;

  const handleMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < nearestDist) { nearestDist = dist; nearest = i; }
    });
    setHoverIndex(nearest);
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  if (showTable) {
    return (
      <div>
        <div className="trend-chart__overflow">
          <table className="trend-table">
            <thead>
              <tr>
                <th>תאריך</th>
                <th>{unitLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label}>
                  <td>{d.label}</td>
                  <td>{formatValue(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="link-btn trend-chart__toggle" onClick={() => setShowTable(false)}>
          הצג כגרף
        </button>
      </div>
    );
  }

  return (
    <div className="trend-chart">
      <svg
        className="trend-chart__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`${unitLabel} לאורך זמן, בין ${formatValue(min)} ל-${formatValue(max)}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--teal-impact)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--teal-impact)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => (
          <line
            key={g.y}
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={g.y}
            y2={g.y}
            className="trend-chart__grid"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} className="trend-chart__line" />

        {hoverIndex !== null && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            className="trend-chart__crosshair"
          />
        )}

        {/* Rounded, anchored end marker on the most recent point */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={4}
          className="trend-chart__end"
        />
        {hoverIndex !== null && (
          <circle cx={hovered.x} cy={hovered.y} r={4} className="trend-chart__end" />
        )}

        {points.map((p, i) => (
          <text
            key={p.label}
            x={p.x}
            y={HEIGHT - 8}
            className="trend-chart__axis-label"
            textAnchor="middle"
            style={{ opacity: i === 0 || i === points.length - 1 ? 1 : 0 }}
          >
            {p.label}
          </text>
        ))}
      </svg>

      <div className="trend-chart__tooltip">
        <span className="trend-chart__tooltip-label">{hovered.label}</span>
        <span className="trend-chart__tooltip-value">{formatValue(hovered.value)} {unitLabel}</span>
      </div>

      <button type="button" className="link-btn trend-chart__toggle" onClick={() => setShowTable(true)}>
        הצג כטבלה
      </button>
    </div>
  );
}
