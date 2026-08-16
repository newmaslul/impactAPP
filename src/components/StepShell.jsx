import { useNavigate } from 'react-router-dom';

const TOTAL_STEPS = 3;

/**
 * Shared chrome for the three onboarding steps: back button, step
 * progress (§3 of the product spec has no numbering in the copy, but the
 * flow itself is a fixed 3-step sequence, so a segmented bar communicates
 * position honestly), eyebrow + headline, and a footer slot for the CTA.
 */
export default function StepShell({ step, eyebrow, title, description, children, footer, onBack }) {
  const navigate = useNavigate();

  return (
    <div className="screen">
      <div className="screen__wash" aria-hidden="true" />
      <div className="screen__inner">
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
          <div className="progress" role="img" aria-label={`שלב ${step} מתוך ${TOTAL_STEPS}`}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`progress__seg ${i < step ? 'progress__seg--filled' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="step-head">
          {eyebrow && <span className="step-head__eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>

        <div className="step-body">{children}</div>

        <div className="step-footer">{footer}</div>
      </div>
    </div>
  );
}
