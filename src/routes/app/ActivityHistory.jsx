import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';
import TrendChart from '../../components/admin/TrendChart.jsx';
import { api } from '../../lib/api.js';
import { formatNumber } from '../../lib/format.js';

function formatShortDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function ActivityHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.activityHistory(30).then(({ history }) => setHistory(history));
    api.activitySummary().then(setSummary);
  }, []);

  const chartData = (history ?? [])
    .filter((d) => d.activity_score != null)
    .map((d) => ({ label: formatShortDate(d.date), value: d.activity_score }));

  return (
    <div className="detail-section">
      <SubPageHeader title="ההיסטוריה שלי" onBack={() => navigate('/app/home')} />

      {summary && (
        <div className="stat-grid">
          <div className="card stat-tile">
            <span className="stat-tile__icon" aria-hidden="true">📅</span>
            <p className="stat-tile__value">{summary.weeklyAverage ?? '—'}</p>
            <p className="stat-tile__label">ממוצע שבועי</p>
          </div>
          <div className="card stat-tile">
            <span className="stat-tile__icon" aria-hidden="true">🗓️</span>
            <p className="stat-tile__value">{summary.monthlyAverage ?? '—'}</p>
            <p className="stat-tile__label">ממוצע חודשי</p>
          </div>
        </div>
      )}

      <section className="card">
        <p className="card__label">30 הימים האחרונים</p>
        {chartData.length > 0 ? (
          <TrendChart data={chartData} formatValue={(n) => formatNumber(Math.round(n))} unitLabel="נקודות" />
        ) : (
          <p className="org-empty">אין עדיין מספיק נתונים להצגת גרף</p>
        )}
      </section>
    </div>
  );
}
