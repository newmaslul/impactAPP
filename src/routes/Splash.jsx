import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBiometricAuth } from '../hooks/useBiometricAuth.js';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Splash() {
  const navigate = useNavigate();
  const [view, setView] = useState('login'); // 'login' | 'forgot'

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

        {view === 'login' ? (
          <LoginBlock onForgot={() => setView('forgot')} />
        ) : (
          <ForgotPasswordBlock onBack={() => setView('login')} />
        )}

        {view === 'login' && (
          <p className="auth-switch">
            אין לך חשבון?
            <button type="button" className="link-btn" onClick={() => navigate('/onboarding')}>
              צור משתמש חדש
            </button>
          </p>
        )}
      </div>

      <p className="splash__footer">מסלול IMPACT</p>
    </div>
  );
}

function LoginBlock({ onForgot }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { available: bioAvailable, hasSavedCredential, busy: bioBusy, error: bioError, authenticate } = useBiometricAuth();

  // No backend exists yet, so this is a demo login: it validates the form
  // shape client-side and then goes straight into the app rather than
  // checking real credentials against a server.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('הכניסו כתובת אימייל תקינה');
      return;
    }
    if (password.length < 6) {
      setError('הסיסמה צריכה להכיל לפחות 6 תווים');
      return;
    }
    setError('');
    navigate('/app/home');
  };

  const handleBiometric = async () => {
    const ok = await authenticate();
    if (ok) navigate('/app/home');
  };

  return (
    <form className="auth-block" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="email">אימייל</label>
        <input
          id="email"
          type="email"
          className="text-input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          dir="ltr"
        />
      </div>

      <div className="field">
        <label htmlFor="password">סיסמה</label>
        <input
          id="password"
          type="password"
          className="text-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          dir="ltr"
        />
      </div>

      <div className="auth-links-row">
        <button type="button" className="link-btn" onClick={onForgot}>שכחתי סיסמה</button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-primary">התחברות</button>

      {bioAvailable && (
        <>
          <div className="auth-divider">או</div>
          <button
            type="button"
            className="btn-ghost btn-ghost--block"
            onClick={handleBiometric}
            disabled={bioBusy}
          >
            <span aria-hidden="true">🔐</span>
            {bioBusy ? 'מאמת…' : hasSavedCredential ? 'כניסה מהירה עם זיהוי ביומטרי' : 'הפעילו כניסה מהירה ביומטרית'}
          </button>
          {bioError && <p className="form-error">{bioError}</p>}
        </>
      )}
    </form>
  );
}

function ForgotPasswordBlock({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('הכניסו כתובת אימייל תקינה');
      return;
    }
    setError('');
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-block">
        <p className="forgot-success">
          אם הכתובת <strong dir="ltr">{email}</strong> קיימת במערכת, נשלח אליה קישור לאיפוס סיסמה.
        </p>
        <button type="button" className="btn-ghost btn-ghost--block" onClick={onBack}>
          חזרה להתחברות
        </button>
      </div>
    );
  }

  return (
    <form className="auth-block" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="forgot-email">אימייל</label>
        <input
          id="forgot-email"
          type="email"
          className="text-input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          dir="ltr"
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-primary">שלח קישור לאיפוס</button>
      <button type="button" className="btn-ghost btn-ghost--block" onClick={onBack}>
        חזרה להתחברות
      </button>
    </form>
  );
}
