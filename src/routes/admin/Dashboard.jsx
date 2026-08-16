import TrendChart from '../../components/admin/TrendChart.jsx';
import { formatNumber, formatCompact } from '../../lib/format.js';

// Mock org data — will come from the backend once accounts exist.
const KPIS = [
  { label: 'משתתפים', value: 742, format: 'number' },
  { label: 'Engagement', value: 78, format: 'percent' },
  { label: 'צעדים', value: 12_400_000, format: 'compact' },
  { label: 'שעות פעילות', value: 8420, format: 'number' },
  { label: 'התנדבות', value: 1240, format: 'number', suffix: 'שעות' },
  { label: 'IMPACT', value: 38420, format: 'currency' },
];

const PARTICIPATION_TREND = [
  { label: '1/8', value: 486 },
  { label: '3/8', value: 512 },
  { label: '5/8', value: 549 },
  { label: '7/8', value: 561 },
  { label: '9/8', value: 598 },
  { label: '11/8', value: 617 },
  { label: '13/8', value: 654 },
  { label: '15/8', value: 671 },
  { label: '17/8', value: 690 },
  { label: '19/8', value: 705 },
  { label: '21/8', value: 718 },
  { label: '23/8', value: 726 },
  { label: '25/8', value: 735 },
  { label: '27/8', value: 742 },
];

const DEPARTMENTS = [
  { name: 'פיתוח', engagement: 91, points: 92400 },
  { name: 'שיווק', engagement: 87, points: 88200 },
  { name: 'מכירות', engagement: 72, points: 81700 },
  { name: 'כספים', engagement: 64, points: 63200 },
];

function formatKpi(kpi) {
  switch (kpi.format) {
    case 'percent': return `${kpi.value}%`;
    case 'compact': return formatCompact(kpi.value);
    case 'currency': return `₪${formatNumber(kpi.value)}`;
    default: return kpi.suffix ? `${formatNumber(kpi.value)} ${kpi.suffix}` : formatNumber(kpi.value);
  }
}

export default function Dashboard() {
  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Dashboard</h1>

      <div className="kpi-grid">
        {KPIS.map((kpi) => (
          <div className="card kpi-tile" key={kpi.label}>
            <p className="kpi-tile__value">{formatKpi(kpi)}</p>
            <p className="kpi-tile__label">{kpi.label}</p>
          </div>
        ))}
      </div>

      <section className="card">
        <p className="card__label">פעילות לאורך זמן</p>
        <TrendChart data={PARTICIPATION_TREND} formatValue={formatNumber} unitLabel="משתתפים פעילים" />
      </section>

      <section className="card">
        <p className="card__label">מחלקות</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>מחלקה</th>
                <th>Engagement</th>
                <th>נקודות</th>
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((d) => (
                <tr key={d.name}>
                  <td className="admin-table__name">{d.name}</td>
                  <td>
                    <div className="admin-table__engagement">
                      <span className="admin-table__engagement-bar">
                        <span className="admin-table__engagement-fill" style={{ width: `${d.engagement}%` }} />
                      </span>
                      <span className="admin-table__engagement-pct">{d.engagement}%</span>
                    </div>
                  </td>
                  <td className="admin-table__points">{formatNumber(d.points)} נק'</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
