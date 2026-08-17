import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBiometricAuth } from '../hooks/useBiometricAuth.js';
import { api, setToken } from '../lib/api.js';
import { setBiometricPhone } from '../lib/biometricDevice.js';
import { DEPARTMENTS } from '../lib/departments.js';

const PHONE_RE = /^0\d{8,9}$/;

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const [phone, setPhone] = useState(location.state?.phone ?? '');
  const [username, setUsername] = useState('');
  const [accountType, setAccountType] = useState('employee'); // 'employee' | 'student'
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.adminListClasses().then(({ classes }) => {
      setClasses(classes);
      if (classes.length) setClassId(String(classes[0].id));
    }).catch(() => {});
  }, []);

  const { available: bioAvailable, busy: bioBusy, error: bioError, authenticate } = useBiometricAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleEnableBiometric = async () => {
    const ok = await authenticate();
    if (ok) setBiometricEnabled(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // See Splash.jsx's LoginBlock.handleSubmit for why: iOS Safari ties
    // "shake to undo" to whichever text input last had focus, and an SPA
    // route change doesn't clear that on its own.
    document.activeElement?.blur();
    if (!PHONE_RE.test(phone.trim())) return setError('הכניסו מספר טלפון תקין (לדוגמה 0501234567)');
    if (!username.trim()) return setError('נדרש שם משתמש');
    if (password.length < 6) return setError('הסיסמה צריכה להכיל לפחות 6 תווים');
    if (accountType === 'student' && !classId) return setError('נדרשת כיתה');

    setError('');
    setBusy(true);
    try {
      const { token } = await api.register({
        phone: phone.trim(),
        username: username.trim(),
        password,
        biometricEnabled,
        role: accountType,
        ...(accountType === 'student' ? { classId: Number(classId) } : { department }),
      });
      setToken(token);
      if (biometricEnabled) setBiometricPhone(phone.trim());
      // Employees continue into the existing product onboarding (role,
      // org, connecting an activity source). Students skip straight to
      // their dashboard — that onboarding flow is about corporate
      // org/role selection, which doesn't apply to a child's account.
      navigate(accountType === 'student' ? '/app/home' : '/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
            <label htmlFor="reg-phone">טלפון</label>
            <input
              id="reg-phone"
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
            <label>סוג חשבון</label>
            <div className="checkbox-list">
              <label className="checkbox-row">
                <input type="radio" name="accountType" checked={accountType === 'employee'} onChange={() => setAccountType('employee')} />
                <span>עובד/ה</span>
              </label>
              <label className="checkbox-row">
                <input type="radio" name="accountType" checked={accountType === 'student'} onChange={() => setAccountType('student')} />
                <span>תלמיד/ה</span>
              </label>
            </div>
          </div>

          {accountType === 'employee' ? (
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
          ) : (
            <div className="field">
              <label htmlFor="reg-class">כיתה</label>
              <select
                id="reg-class"
                className="text-input"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.school_name} · {c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="reg-password">סיסמה</label>
            <input
              id="reg-password"
              type="password"
              className="text-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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

          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'יוצרים חשבון…' : 'השלימו רישום'}</button>

          <button type="button" className="link-btn" style={{ alignSelf: 'center' }} onClick={() => navigate('/')}>
            כבר יש לי חשבון — חזרה להתחברות
          </button>
        </form>
      </div>

      <p className="splash__footer">מסלול IMPACT</p>
    </div>
  );
}
