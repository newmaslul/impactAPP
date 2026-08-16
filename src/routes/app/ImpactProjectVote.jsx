import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubPageHeader from '../../components/SubPageHeader.jsx';

const OPTIONS = [
  { id: 'community', icon: '❤️', title: 'קהילה', desc: 'פעילות למשפחות' },
  { id: 'sport', icon: '🏃', title: 'ספורט', desc: 'ציוד ספורט לילדים' },
  { id: 'environment', icon: '🌳', title: 'סביבה', desc: 'שיקום מרחב ציבורי' },
  { id: 'volunteering', icon: '🤝', title: 'התנדבות', desc: 'פרויקט קהילתי' },
];

export default function ImpactProjectVote() {
  const navigate = useNavigate();
  const [choice, setChoice] = useState(null);
  const [voted, setVoted] = useState(false);

  if (voted) {
    const picked = OPTIONS.find((o) => o.id === choice);
    return (
      <div className="detail-section">
        <SubPageHeader title="בחירת פרויקט" onBack={() => navigate('/app/impact')} />
        <div className="vote-success">
          <span className="vote-success__icon" aria-hidden="true">✓</span>
          <h1>ההצבעה נקלטה!</h1>
          <p>
            הצבעת עבור <strong>{picked.icon} {picked.title}</strong> — {picked.desc}
          </p>
          <button type="button" className="btn-primary" style={{ width: 'auto', marginTop: '0.6rem' }} onClick={() => navigate('/app/impact')}>
            חזרה למסך Impact
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-section">
      <SubPageHeader title="בחירת פרויקט" onBack={() => navigate('/app/impact')} />

      <h1>איזו השפעה נרצה ליצור?</h1>

      <div role="radiogroup" aria-label="בחירת פרויקט" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {OPTIONS.map((opt) => {
          const selected = choice === opt.id;
          return (
            <button
              type="button"
              key={opt.id}
              role="radio"
              aria-checked={selected}
              className={`option-card ${selected ? 'option-card--selected' : ''}`}
              onClick={() => setChoice(opt.id)}
            >
              <span className="option-card__icon" aria-hidden="true">{opt.icon}</span>
              <span className="option-card__text">
                <span className="option-card__title">{opt.title}</span>
                <span className="option-card__desc">{opt.desc}</span>
              </span>
              <span className="option-card__radio" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={!choice}
        onClick={() => setVoted(true)}
      >
        הצבע
      </button>

      <p className="vote-hint">כך העובדים הופכים לחלק מקבלת ההחלטה.</p>
    </div>
  );
}
