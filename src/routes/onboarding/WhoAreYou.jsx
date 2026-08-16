import { useNavigate } from 'react-router-dom';
import StepShell from '../../components/StepShell.jsx';
import { useOnboarding } from './OnboardingContext.jsx';

const ROLES = [
  { id: 'employee', label: 'עובד', icon: '💼' },
  { id: 'manager', label: 'מנהל', icon: '📊' },
  { id: 'resident', label: 'תושב', icon: '🏘️' },
  { id: 'member', label: 'חבר ארגון', icon: '🤝' },
];

export default function WhoAreYou() {
  const navigate = useNavigate();
  const { role, setRole } = useOnboarding();

  return (
    <StepShell
      step={1}
      eyebrow="שלב 1 מתוך 3"
      title="מי אתה?"
      onBack={() => navigate('/')}
      footer={
        <button
          type="button"
          className="btn-primary"
          disabled={!role}
          onClick={() => navigate('/onboarding/organization')}
        >
          <span>המשך</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      }
    >
      <div role="radiogroup" aria-label="מי אתה?" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {ROLES.map((r) => {
          const selected = role === r.id;
          return (
            <button
              type="button"
              key={r.id}
              role="radio"
              aria-checked={selected}
              className={`option-card ${selected ? 'option-card--selected' : ''}`}
              onClick={() => setRole(r.id)}
            >
              <span className="option-card__icon" aria-hidden="true">{r.icon}</span>
              <span className="option-card__label">{r.label}</span>
              <span className="option-card__radio" />
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
