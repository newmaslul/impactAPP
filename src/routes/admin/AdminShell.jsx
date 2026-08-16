import { Outlet } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';

// Mock signed-in org — will come from the admin's account once auth exists.
const ORG_NAME = 'חברת ABC';

export default function AdminShell() {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-shell__main">
        <header className="admin-topbar">
          <span className="admin-topbar__product">מסלול IMPACT</span>
          <span className="admin-topbar__sep" aria-hidden="true">|</span>
          <span className="admin-topbar__org">{ORG_NAME}</span>
        </header>
        <main className="admin-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
