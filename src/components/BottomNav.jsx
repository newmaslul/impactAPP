import { NavLink } from 'react-router-dom';

// Order matters for more than reading — under RTL (index.html sets
// dir="rtl"), a plain flex row lays children out starting from the
// right, so the FIRST entry here renders rightmost on screen and the
// LAST renders leftmost. This order was picked to match a provided
// mockup's left-to-right layout (פרופיל…הישגים) exactly, not just to
// read naturally top-to-bottom in this array.
const TABS = [
  { to: '/app/achievements', label: 'הישגים', icon: '🥇' },
  { to: '/app/learning', label: 'בוסט וידאו', icon: '▶️' },
  { to: '/app/home', label: 'בית', icon: '🏠' },
  { to: '/app/challenges', label: 'אתגרים', icon: '🏆' },
  { to: '/app/profile', label: 'פרופיל', icon: '👤' },
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
