import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBiometricAuth } from '../hooks/useBiometricAuth.js';
import { saveUser, setCurrentUserEmail, setBiometricUserEmail } from '../lib/userStore.js';
import { DEPARTMENTS } from '../lib/departments.js';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^0\d{8,9}$/;

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email ?? '');
  const [username, setUsername] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const { available: bioAvailable, busy: bioBusy, error: bioError, authenticate } = useBiometricAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleEnableBiometric = async () => {
    const ok = await authenticate();
    if (ok) setBiometricEnabled(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError('הכניסו כתובת אימייל תקינה');
    if (!username.trim()) return setError('נדרש שם משתמש');
    if (!PHONE_RE.test(phone.trim())) return setError('הכניסו מספר טלפון תקין (לדוגמה 0501234567)');

    setError('');
    const user = saveUser({ email, username: username.trim(), department, phone: phone.trim(), biometricEnabled });
    setCurrentUserEmail(user.email);
    if (biometricEnabled) setBiometricUserEmail(user.email);

    // Account created — continue into product onboarding (role, org,
    // connecting an activity source) before landing in the app.
    navigate('/onboarding');
  };

  return (
    <div className="screen">
      <div className="screen__wash" aria-hidden="true" />
      <div className="screen__inner splash__inner">
        <p className="splash__eyebrow">
          <span>Move</span><span className="dot">•</span>
          <span>Connect</span><span className="dot">•</span>
          <span>Impact</span>
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 7vw, 2.6rem)' }}>משתמש חדש</h1>
        <p className="splash__subtitle">לא מצאנו אתכם במערכת — בואו ניצור חשבון.</p>

        <form className="auth-block" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="reg-email">אימייל</label>
            <input
              id="reg-email"
              type="email"
              className="text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
            />
          </div>

          <div className="field">
            <label htmlFor="reg-username">שם משתמש</label>
            <input
              id="reg-username"
              type="text"
              className="text-input"
              placeholder="לדוגמה: דנה לוי"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-department">מחלקה</label>
            <select
              id="reg-department"
              className="text-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="reg-phone">מספר טלפון</label>
            <input
              id="reg-phone"
              type="tel"
              className="text-input"
              placeholder="0501234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
            />
          </div>

          {bioAvailable && (
            <div className="field">
              <label>זיהוי ביומטרי</label>
              <button
                type="button"
                className={`btn-ghost btn-ghost--block ${biometricEnabled ? 'btn-ghost--done' : ''}`}
                onClick={handleEnableBiometric}
                disabled={bioBusy || biometricEnabled}
              >
                <span aria-hidden="true">{biometricEnabled ? '✅' : '🔐'}</span>
                {biometricEnabled ? 'זיהוי ביומטרי מופעל' : bioBusy ? 'מאמת…' : 'הפעילו כניסה מהירה ביומטרית'}
              </button>
              {bioError && <p className="form-error">{bioError}</p>}
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary">השלימו רישום</button>

          <button type="button" className="link-btn" style={{ alignSelf: 'center' }} onClick={() => navigate('/')}>
            כבר יש לי חשבון — חזרה להתחברות
          </button>
        </form>
      </div>

      <p className="splash__footer">מסלול IMPACT</p>
    </div>
  );
}
