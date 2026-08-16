import { useState } from 'react';
import { DEPARTMENTS } from '../../lib/departments.js';

const PHONE_RE = /^0\d{8,9}$/;

export default function EmployeeInviteForm({ onCancel, onSubmit }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [role, setRole] = useState('employee');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('נדרש שם');
    if (!PHONE_RE.test(phone.trim())) return setError('הכניסו מספר טלפון תקין (לדוגמה 0501234567)');

    setError('');
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), phone: phone.trim(), department, role });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">הזמן עובד</h1>
      </div>

      <form className="card admin-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="employee-name">שם מלא</label>
          <input
            id="employee-name"
            type="text"
            className="text-input"
            placeholder="לדוגמה: דנה לוי"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="employee-phone">טלפון</label>
          <input
            id="employee-phone"
            type="tel"
            className="text-input"
            placeholder="0501234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="field">
          <label htmlFor="employee-department">מחלקה</label>
          <select
            id="employee-department"
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
          <label>תפקיד</label>
          <div className="checkbox-list">
            <label className="checkbox-row">
              <input type="radio" name="role" checked={role === 'employee'} onChange={() => setRole('employee')} />
              <span>עובד</span>
            </label>
            <label className="checkbox-row">
              <input type="radio" name="role" checked={role === 'manager'} onChange={() => setRole('manager')} />
              <span>מנהל</span>
            </label>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="admin-form__actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>ביטול</button>
          <button type="submit" className="btn-primary admin-form__submit" disabled={busy}>
            {busy ? 'שולחים…' : 'שלח הזמנה'}
          </button>
        </div>
      </form>
    </div>
  );
}
