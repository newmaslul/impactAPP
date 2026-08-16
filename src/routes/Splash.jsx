import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="screen">
      <div className="screen__wash" aria-hidden="true" />
      <div className="screen__inner splash__inner">
        <svg className="splash__mark" viewBox="0 0 56 56" aria-hidden="true">
          <path d="M10,44 C18,44 16,30 26,28 C36,26 34,14 46,12" />
          <circle cx="10" cy="44" r="5" />
          <circle cx="26" cy="28" r="5" />
          <circle cx="46" cy="12" r="5" />
        </svg>

        <p className="splash__eyebrow">
          <span>Move</span><span className="dot">•</span>
          <span>Connect</span><span className="dot">•</span>
          <span>Impact</span>
        </p>

        <h1>מסלול חדש</h1>

        <p className="splash__subtitle">הופכים פעילות אישית להשפעה משותפת</p>

        <button
          className="btn-primary splash__cta"
          type="button"
          onClick={() => navigate('/onboarding')}
        >
          <span>התחל את המסלול</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      </div>

      <p className="splash__footer">מסלול IMPACT</p>
    </div>
  );
}
