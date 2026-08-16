import { useNavigate } from 'react-router-dom';

/** Back + title header for drill-down screens reached from a tab root (e.g. challenge detail). */
export default function SubPageHeader({ title, onBack }) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      <button
        type="button"
        className="topbar__back"
        aria-label="חזרה"
        onClick={() => (onBack ? onBack() : navigate(-1))}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <h2 className="topbar__title">{title}</h2>
    </div>
  );
}
