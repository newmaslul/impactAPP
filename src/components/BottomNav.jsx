import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/app/home', label: 'בית', icon: '🏠' },
  { to: '/app/challenges', label: 'אתגרים', icon: '🎯' },
  { to: '/app/group', label: 'קבוצה', icon: '👥' },
  { to: '/app/impact', label: 'Impact', icon: '❤️' },
  { to: '/app/profile', label: 'אני', icon: '👤' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
        >
          <span className="bottom-nav__icon" aria-hidden="true">{tab.icon}</span>
          <span className="bottom-nav__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
