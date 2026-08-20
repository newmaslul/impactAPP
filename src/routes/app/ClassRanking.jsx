import { useNavigate } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';
import { formatNumber } from '../../lib/format.js';

// Mock data — will come from a class-steps leaderboard endpoint once the
// class challenge is data-driven (mirrors Group.jsx's RANKING pattern,
// same numbers/order as the mockup: total steps per class, not points).
const RANKING = [
  { name: 'הכיתה של נחון', steps: 98450 },
  { name: 'הכיתה של פרועה', steps: 87230 },
  { name: 'הכיתה של יעבל', steps: 76890 },
  { name: 'הכיתה של דנה', steps: 65430 },
  { name: 'הכיתה של מאי', steps: 58210 },
  { name: 'הכיתה של אורי', steps: 45670 },
];

const initial = (name) => name.trim().split(' ').pop()[0];

function PodiumSpot({ entry, place }) {
  const tone = place === 1 ? 'first' : place === 2 ? 'second' : 'third';
  return (
    <div className={`podium__spot podium__spot--${tone}`}>
      {place === 1 && <span className="podium__crown" aria-hidden="true">👑</span>}
      <span className="podium__avatar" aria-hidden="true">{initial(entry.name)}</span>
      <span className="podium__name">{entry.name}</span>
      <span className="podium__points">{formatNumber(entry.steps)}</span>
      <div className="podium__block">{place}</div>
    </div>
  );
}

export default function ClassRanking() {
  const navigate = useNavigate();
  const [first, second, third, ...rest] = RANKING;

  return (
    <div className="detail-section">
      <SubPageHeader title="דירוג כיתתי" onBack={() => navigate('/app/challenges')} />

      <section className="card">
        <p className="card__label">השבוע</p>
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
              <span className="rank-row__points">{formatNumber(entry.steps)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
