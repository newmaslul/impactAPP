import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';
import { CurrentUserProvider } from '../context/CurrentUserContext.jsx';
import { useAppUpdateCheck } from '../hooks/useAppUpdateCheck.js';

export default function AppShell() {
  const updateAvailable = useAppUpdateCheck();

  return (
    <CurrentUserProvider>
      <div className="app-shell">
        <div className="screen__wash" aria-hidden="true" />
        {updateAvailable && (
          <div className="update-banner" role="status">
            <span>גרסה חדשה זמינה</span>
            <button type="button" className="update-banner__cta" onClick={() => window.location.reload()}>
              רענן
            </button>
          </div>
        )}
        <main className="app-shell__content">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </CurrentUserProvider>
  );
}
