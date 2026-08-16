import { useEffect, useMemo, useState } from 'react';
import EmployeeInviteForm from './EmployeeInviteForm.jsx';
import EditEmployeeForm from './EditEmployeeForm.jsx';
import { formatNumber } from '../../lib/format.js';
import { DEPARTMENTS } from '../../lib/departments.js';
import { api } from '../../lib/api.js';

function statusMeta(status) {
  if (status === 'active') return { label: 'פעיל', cls: 'status-pill--active' };
  if (status === 'invited') return { label: 'הוזמן', cls: 'status-pill--scheduled' };
  return { label: 'לא פעיל', cls: 'status-pill--ended' };
}

function roleLabel(role) {
  return role === 'manager' ? 'מנהל' : 'עובד';
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'invite' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');

  const loadEmployees = () => {
    setLoading(true);
    api.adminListEmployees()
      .then(({ employees }) => { setEmployees(employees); setLoadError(''); })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadEmployees, []);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesQuery = !query.trim() || e.username.includes(query.trim());
      const matchesDept = department === 'all' || e.department === department;
      return matchesQuery && matchesDept;
    });
  }, [employees, query, department]);

  const handleInvite = async (invite) => {
    await api.adminInviteEmployee(invite);
    setView('list');
    loadEmployees();
  };

  const editingEmployee = employees.find((e) => e.id === editingId) ?? null;

  const handleSave = async (updated) => {
    await api.adminUpdateEmployee(updated.id, {
      department: updated.department,
      role: updated.role,
      status: updated.status,
    });
    setView('list');
    setEditingId(null);
    loadEmployees();
  };

  const handleRemove = async (id) => {
    await api.adminDeleteEmployee(id);
    setView('list');
    setEditingId(null);
    loadEmployees();
  };

  if (view === 'invite') {
    return <EmployeeInviteForm onCancel={() => setView('list')} onSubmit={handleInvite} />;
  }

  if (view === 'edit' && editingEmployee) {
    return (
      <EditEmployeeForm
        employee={{ ...editingEmployee, name: editingEmployee.username, phone: editingEmployee.phone }}
        onCancel={() => { setView('list'); setEditingId(null); }}
        onSave={handleSave}
        onRemove={handleRemove}
      />
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">ניהול משתמשים</h1>
        <button type="button" className="btn-primary admin-page__header-cta" onClick={() => setView('invite')}>
          + הזמן עובד
        </button>
      </div>

      <section className="card">
        <div className="admin-toolbar">
          <div className="search-field admin-toolbar__search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="חיפוש לפי שם"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="חיפוש עובד"
            />
          </div>
          <select
            className="text-input admin-toolbar__filter"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            aria-label="סינון לפי מחלקה"
          >
            <option value="all">כל המחלקות</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {loadError && <p className="form-error" style={{ marginBottom: '1rem' }}>{loadError}</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>מחלקה</th>
                <th>תפקיד</th>
                <th>פעילות השבוע</th>
                <th>נקודות</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="admin-table__empty">טוען…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="admin-table__empty">לא נמצאו עובדים</td></tr>
              ) : (
                filtered.map((e) => {
                  const s = statusMeta(e.status);
                  return (
                    <tr key={e.id}>
                      <td className="admin-table__name">{e.username}</td>
                      <td>{e.department}</td>
                      <td>{roleLabel(e.role)}</td>
                      <td>
                        <div className="admin-table__engagement">
                          <span className="admin-table__engagement-bar">
                            <span className="admin-table__engagement-fill" style={{ width: `${e.weeklyActivity}%` }} />
                          </span>
                          <span className="admin-table__engagement-pct">{e.weeklyActivity}%</span>
                        </div>
                      </td>
                      <td className="admin-table__points">{formatNumber(e.points)}</td>
                      <td><span className={`status-pill ${s.cls}`}>{s.label}</span></td>
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => { setEditingId(e.id); setView('edit'); }}
                        >
                          ערוך
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
