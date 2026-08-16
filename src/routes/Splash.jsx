import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBiometricAuth } from '../hooks/useBiometricAuth.js';
import { findUserByPhone, setCurrentUserPhone, getBiometricUserPhone } from '../lib/userStore.js';

const PHONE_RE = /^0\d{8,9}$/;

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
            <button type="button" className="link-btn" onClick={() => navigate('/register')}>
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
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { available: bioAvailable, busy: bioBusy, error: bioError, authenticate } = useBiometricAuth();
  const biometricUserPhone = getBiometricUserPhone();

  // No backend exists yet, so "the system" this checks against is this
  // browser's own localStorage (see lib/userStore.js): a known phone
  // number logs straight in, an unrecognized one is sent to register — it
  // never actually verifies the password against anything, since none is
  // stored.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!PHONE_RE.test(phone.trim())) {
      setError('הכניסו מספר טלפון תקין (לדוגמה 0501234567)');
      return;
    }
    if (password.length < 6) {
      setError('הסיסמה צריכה להכיל לפחות 6 תווים');
      return;
    }
    setError('');
    const existing = findUserByPhone(phone);
    if (existing) {
      setCurrentUserPhone(existing.phone);
      navigate('/app/home');
    } else {
      navigate('/register', { state: { phone } });
    }
  };

  const handleBiometric = async () => {
    const ok = await authenticate();
    if (!ok) return;
    if (biometricUserPhone) {
      setCurrentUserPhone(biometricUserPhone);
      navigate('/app/home');
    } else {
      navigate('/register');
    }
  };

  return (
    <form className="auth-block" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="phone">טלפון</label>
        <input
          id="phone"
          type="tel"
          className="text-input"
          placeholder="0501234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
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

      {bioAvailable && biometricUserPhone && (
        <>
          <div className="auth-divider">או</div>
          <button
            type="button"
            className="btn-ghost btn-ghost--block"
            onClick={handleBiometric}
            disabled={bioBusy}
          >
            <span aria-hidden="true">🔐</span>
            {bioBusy ? 'מאמת…' : 'כניסה מהירה עם זיהוי ביומטרי'}
          </button>
          {bioError && <p className="form-error">{bioError}</p>}
        </>
      )}
    </form>
  );
}

function ForgotPasswordBlock({ onBack }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!PHONE_RE.test(phone.trim())) {
      setError('הכניסו מספר טלפון תקין (לדוגמה 0501234567)');
      return;
    }
    setError('');
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-block">
        <p className="forgot-success">
          אם המספר <strong dir="ltr">{phone}</strong> קיים במערכת, נשלח אליו קוד לאיפוס סיסמה ב-SMS.
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
        <label htmlFor="forgot-phone">טלפון</label>
        <input
          id="forgot-phone"
          type="tel"
          className="text-input"
          placeholder="0501234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          dir="ltr"
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-primary">שלח קוד לאיפוס</button>
      <button type="button" className="btn-ghost btn-ghost--block" onClick={onBack}>
        חזרה להתחברות
      </button>
    </form>
  );
}
