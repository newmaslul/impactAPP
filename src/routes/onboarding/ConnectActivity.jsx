import { useNavigate } from 'react-router-dom';
import StepShell from '../../components/StepShell.jsx';
import { useOnboarding } from './OnboardingContext.jsx';

const PROVIDERS = [
  { id: 'apple-health', label: 'Apple Health', icon: '🍏' },
  { id: 'google-health-connect', label: 'Google Health Connect', icon: '🩺' },
  { id: 'garmin', label: 'Garmin', icon: '⌚' },
  { id: 'fitbit', label: 'Fitbit', icon: '💓' },
  { id: 'maslul-band', label: 'מסלול Band', icon: '📶' },
];

export default function ConnectActivity() {
  const navigate = useNavigate();
  const { connectedProviders, toggleProvider } = useOnboarding();
  const hasConnection = connectedProviders.length > 0;

  return (
    <StepShell
      step={3}
      eyebrow="שלב 3 מתוך 3"
      title="חבר את הפעילות שלך"
      description="נדרש חיבור למקור אחד לפחות כדי לעקוב אחרי הצעדים והפעילות שלך."
      footer={
        <>
          <button
            type="button"
            className="btn-primary"
            disabled={!hasConnection}
            onClick={() => navigate('/app/home')}
          >
            התחבר
          </button>
          <button type="button" className="btn-link" onClick={() => navigate('/app/home')}>
            דלג בינתיים
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {PROVIDERS.map((p) => {
          const connected = connectedProviders.includes(p.id);
          return (
            <button
              type="button"
              key={p.id}
              className={`provider-card ${connected ? 'provider-card--connected' : ''}`}
              onClick={() => toggleProvider(p.id)}
              aria-pressed={connected}
            >
              <span className="provider-card__icon" aria-hidden="true">{p.icon}</span>
              <span style={{ flex: 1, textAlign: 'right' }}>
                <span className="provider-card__label" style={{ display: 'block' }}>{p.label}</span>
                <span className="provider-card__status">{connected ? 'מחובר' : 'לא מחובר'}</span>
              </span>
              <span className="provider-card__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
