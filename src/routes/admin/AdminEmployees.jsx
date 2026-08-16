import { useMemo, useState } from 'react';
import EmployeeInviteForm from './EmployeeInviteForm.jsx';
import EditEmployeeForm from './EditEmployeeForm.jsx';
import { formatNumber } from '../../lib/format.js';
import { DEPARTMENTS } from '../../lib/departments.js';
import { getUsers, saveUser } from '../../lib/userStore.js';

// Mock roster — will come from the org's account system later.
const MOCK_EMPLOYEES = [
  { id: 'mock-1', name: 'איתי כהן', email: 'itai.cohen@company.com', department: 'פיתוח', role: 'employee', points: 12400, weeklyActivity: 92, status: 'active' },
  { id: 'mock-2', name: 'דנה לוי', email: 'dana.levi@company.com', department: 'שיווק', role: 'manager', points: 11800, weeklyActivity: 88, status: 'active' },
  { id: 'mock-3', name: 'יובל מזרחי', email: 'yuval.mizrahi@company.com', department: 'פיתוח', role: 'employee', points: 9600, weeklyActivity: 95, status: 'active' },
  { id: 'mock-4', name: 'רון אביטן', email: 'ron.avitan@company.com', department: 'מכירות', role: 'employee', points: 8700, weeklyActivity: 71, status: 'active' },
  { id: 'mock-5', name: 'מאיה שפירא', email: 'maya.shapira@company.com', department: 'כספים', role: 'manager', points: 7900, weeklyActivity: 64, status: 'active' },
  { id: 'mock-6', name: 'נועה גולן', email: 'noa.golan@company.com', department: 'שיווק', role: 'employee', points: 6800, weeklyActivity: 58, status: 'active' },
  { id: 'mock-7', name: 'עידו ברק', email: 'ido.barak@company.com', department: 'פיתוח', role: 'employee', points: 5400, weeklyActivity: 0, status: 'invited' },
  { id: 'mock-8', name: 'שירה כץ', email: 'shira.katz@company.com', department: 'מכירות', role: 'employee', points: 4200, weeklyActivity: 40, status: 'active' },
  { id: 'mock-9', name: 'אורי דהן', email: 'uri.dahan@company.com', department: 'כספים', role: 'employee', points: 3100, weeklyActivity: 12, status: 'inactive' },
  { id: 'mock-10', name: 'טל רוזן', email: 'tal.rozen@company.com', department: 'שיווק', role: 'employee', points: 2100, weeklyActivity: 51, status: 'active' },
];

// Real accounts created via /register on this browser (lib/userStore.js)
// merge into the same roster, so this screen actually manages the people
// who signed up on this device — not just the mock data. Accounts are
// keyed by phone (the login screen's identifier), not email.
function buildInitialEmployees() {
  const registered = getUsers().map((u) => ({
    id: `user-${u.phone}`,
    name: u.username,
    phone: u.phone,
    department: u.department,
    role: 'employee',
    points: 0,
    weeklyActivity: 0,
    status: 'active',
    isRegistered: true,
  }));
  const registeredPhones = new Set(registered.map((r) => r.phone));
  return [...registered, ...MOCK_EMPLOYEES.filter((m) => !registeredPhones.has(m.phone))];
}

function statusMeta(status) {
  if (status === 'active') return { label: 'פעיל', cls: 'status-pill--active' };
  if (status === 'invited') return { label: 'הוזמן', cls: 'status-pill--scheduled' };
  return { label: 'לא פעיל', cls: 'status-pill--ended' };
}

function roleLabel(role) {
  return role === 'manager' ? 'מנהל' : 'עובד';
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState(buildInitialEmployees);
  const [view, setView] = useState('list'); // 'list' | 'invite' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesQuery = !query.trim() || e.name.includes(query.trim());
      const matchesDept = department === 'all' || e.department === department;
      return matchesQuery && matchesDept;
    });
  }, [employees, query, department]);

  const handleInvite = (invite) => {
    setEmployees((prev) => [
      { id: `invite-${Date.now()}`, name: invite.name, email: invite.email, department: invite.department, role: invite.role, points: 0, weeklyActivity: 0, status: 'invited' },
      ...prev,
    ]);
    setView('list');
  };

  const editingEmployee = employees.find((e) => e.id === editingId) ?? null;

  const handleSave = (updated) => {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    // Keep the person's own account (lib/userStore.js, used by the mobile
    // app's Home/Profile) in sync for the one field they share.
    if (updated.isRegistered && updated.phone) {
      const existing = getUsers().find((u) => u.phone === updated.phone);
      if (existing) saveUser({ ...existing, department: updated.department });
    }
    setView('list');
    setEditingId(null);
  };

  const handleRemove = (id) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setView('list');
    setEditingId(null);
  };

  if (view === 'invite') {
    return <EmployeeInviteForm onCancel={() => setView('list')} onSubmit={handleInvite} />;
  }

  if (view === 'edit' && editingEmployee) {
    return (
      <EditEmployeeForm
        employee={editingEmployee}
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table__empty">לא נמצאו עובדים</td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const s = statusMeta(e.status);
                  return (
                    <tr key={e.id}>
                      <td className="admin-table__name">{e.name}</td>
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
