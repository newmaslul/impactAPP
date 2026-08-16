import { useState } from 'react';
import { DEPARTMENTS } from '../../lib/departments.js';

const STATUS_OPTIONS = [
  { id: 'active', label: 'פעיל' },
  { id: 'inactive', label: 'לא פעיל' },
];

const ROLE_OPTIONS = [
  { id: 'employee', label: 'עובד' },
  { id: 'manager', label: 'מנהל' },
];

export default function EditEmployeeForm({ employee, onCancel, onSave, onRemove }) {
  const [department, setDepartment] = useState(employee.department);
  const [role, setRole] = useState(employee.role);
  const [status, setStatus] = useState(employee.status === 'invited' ? 'active' : employee.status);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({ ...employee, department, role, status });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await onRemove(employee.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">עריכת משתמש</h1>
      </div>

      <form className="card admin-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label>שם</label>
          <p className="admin-form__readonly">{employee.name}</p>
        </div>

        {employee.email && (
          <div className="field">
            <label>אימייל</label>
            <p className="admin-form__readonly" dir="ltr" style={{ textAlign: 'right' }}>{employee.email}</p>
          </div>
        )}

        {employee.phone && (
          <div className="field">
            <label>טלפון</label>
            <p className="admin-form__readonly" dir="ltr" style={{ textAlign: 'right' }}>{employee.phone}</p>
          </div>
        )}

        <div className="field">
          <label htmlFor="edit-department">מחלקה</label>
          <select
            id="edit-department"
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
            {ROLE_OPTIONS.map((r) => (
              <label className="checkbox-row" key={r.id}>
                <input type="radio" name="role" checked={role === r.id} onChange={() => setRole(r.id)} />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label>סטטוס</label>
          <div className="checkbox-list">
            {STATUS_OPTIONS.map((s) => (
              <label className="checkbox-row" key={s.id}>
                <input type="radio" name="status" checked={status === s.id} onChange={() => setStatus(s.id)} />
                <span>{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="admin-form__actions admin-form__actions--split">
          {confirmingRemove ? (
            <div className="confirm-remove">
              <span>להסיר את {employee.name} מהרשימה?</span>
              <button type="button" className="btn-ghost" onClick={() => setConfirmingRemove(false)} disabled={busy}>ביטול</button>
              <button type="button" className="btn-danger" onClick={handleRemove} disabled={busy}>כן, הסר</button>
            </div>
          ) : (
            <button type="button" className="link-btn link-btn--danger" onClick={() => setConfirmingRemove(true)}>
              הסר עובד
            </button>
          )}

          <div className="admin-form__actions">
            <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>ביטול</button>
            <button type="submit" className="btn-primary admin-form__submit" disabled={busy}>
              {busy ? 'שומרים…' : 'שמור שינויים'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
