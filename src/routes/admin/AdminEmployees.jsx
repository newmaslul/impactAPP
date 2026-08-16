import { useMemo, useState } from 'react';
import EmployeeInviteForm from './EmployeeInviteForm.jsx';
import { formatNumber } from '../../lib/format.js';
import { DEPARTMENTS } from '../../lib/departments.js';

// Mock roster — will come from the org's account system later.
const INITIAL_EMPLOYEES = [
  { id: 1, name: 'איתי כהן', department: 'פיתוח', role: 'employee', points: 12400, weeklyActivity: 92, status: 'active' },
  { id: 2, name: 'דנה לוי', department: 'שיווק', role: 'manager', points: 11800, weeklyActivity: 88, status: 'active' },
  { id: 3, name: 'יובל מזרחי', department: 'פיתוח', role: 'employee', points: 9600, weeklyActivity: 95, status: 'active' },
  { id: 4, name: 'רון אביטן', department: 'מכירות', role: 'employee', points: 8700, weeklyActivity: 71, status: 'active' },
  { id: 5, name: 'מאיה שפירא', department: 'כספים', role: 'manager', points: 7900, weeklyActivity: 64, status: 'active' },
  { id: 6, name: 'נועה גולן', department: 'שיווק', role: 'employee', points: 6800, weeklyActivity: 58, status: 'active' },
  { id: 7, name: 'עידו ברק', department: 'פיתוח', role: 'employee', points: 5400, weeklyActivity: 0, status: 'invited' },
  { id: 8, name: 'שירה כץ', department: 'מכירות', role: 'employee', points: 4200, weeklyActivity: 40, status: 'active' },
  { id: 9, name: 'אורי דהן', department: 'כספים', role: 'employee', points: 3100, weeklyActivity: 12, status: 'inactive' },
  { id: 10, name: 'טל רוזן', department: 'שיווק', role: 'employee', points: 2100, weeklyActivity: 51, status: 'active' },
];

function statusMeta(status) {
  if (status === 'active') return { label: 'פעיל', cls: 'status-pill--active' };
  if (status === 'invited') return { label: 'הוזמן', cls: 'status-pill--scheduled' };
  return { label: 'לא פעיל', cls: 'status-pill--ended' };
}

function roleLabel(role) {
  return role === 'manager' ? 'מנהל' : 'עובד';
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [view, setView] = useState('list'); // 'list' | 'invite'
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
      { id: Date.now(), name: invite.name, department: invite.department, role: invite.role, points: 0, weeklyActivity: 0, status: 'invited' },
      ...prev,
    ]);
    setView('list');
  };

  if (view === 'invite') {
    return <EmployeeInviteForm onCancel={() => setView('list')} onSubmit={handleInvite} />;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">עובדים</h1>
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table__empty">לא נמצאו עובדים</td>
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
