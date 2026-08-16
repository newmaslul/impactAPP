import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/employees', label: 'עובדים', icon: '👥' },
  { to: '/admin/challenges', label: 'אתגרים', icon: '🎯' },
  { to: '/admin/scoring-config', label: 'ציון פעילות', icon: '🧮' },
  { to: '/admin/schools', label: 'בתי ספר', icon: '🏫' },
  { to: '/admin/impact', label: 'Impact', icon: '❤️' },
  { to: '/admin/reports', label: 'דוחות', icon: '📈' },
  { to: '/admin/settings', label: 'הגדרות', icon: '⚙️' },
];

export default function AdminSidebar() {
  return (
    <nav className="admin-sidebar" aria-label="ניווט מערכת ניהול">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__mark" aria-hidden="true">
          <svg viewBox="0 0 56 56">
            <path d="M10,44 C18,44 16,30 26,28 C36,26 34,14 46,12" />
            <circle cx="10" cy="44" r="5" />
            <circle cx="26" cy="28" r="5" />
            <circle cx="46" cy="12" r="5" />
          </svg>
        </span>
        <span className="admin-sidebar__title">מסלול IMPACT</span>
      </div>

      <div className="admin-sidebar__links">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="admin-sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
