import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';

export default function AppShell() {
  return (
    <div className="app-shell">
      <div className="screen__wash" aria-hidden="true" />
      <main className="app-shell__content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
