import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Splash from './routes/Splash.jsx';
import { OnboardingProvider } from './routes/onboarding/OnboardingContext.jsx';
import WhoAreYou from './routes/onboarding/WhoAreYou.jsx';
import Organization from './routes/onboarding/Organization.jsx';
import ConnectActivity from './routes/onboarding/ConnectActivity.jsx';
import AppShell from './components/AppShell.jsx';
import Home from './routes/app/Home.jsx';
import Challenges from './routes/app/Challenges.jsx';
import ChallengeDetail from './routes/app/ChallengeDetail.jsx';
import Group from './routes/app/Group.jsx';
import Impact from './routes/app/Impact.jsx';
import ImpactProjectVote from './routes/app/ImpactProjectVote.jsx';
import Profile from './routes/app/Profile.jsx';
import AdminShell from './routes/admin/AdminShell.jsx';
import Dashboard from './routes/admin/Dashboard.jsx';
import ComingSoon from './routes/ComingSoon.jsx';

function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Outlet />
    </OnboardingProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />

      <Route path="/onboarding" element={<OnboardingLayout />}>
        <Route index element={<WhoAreYou />} />
        <Route path="organization" element={<Organization />} />
        <Route path="connect" element={<ConnectActivity />} />
      </Route>

      <Route path="/app" element={<AppShell />}>
        <Route path="home" element={<Home />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="challenges/:id" element={<ChallengeDetail />} />
        <Route path="group" element={<Group />} />
        <Route path="impact" element={<Impact />} />
        <Route path="impact/vote" element={<ImpactProjectVote />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="employees"
          element={<ComingSoon title="עובדים בבנייה" description="ניהול משתמשים והרשאות נמצא כאן בקרוב." />}
        />
        <Route
          path="challenges"
          element={<ComingSoon title="אתגרים בבנייה" description="יצירה וניהול אתגרים (§12) נמצאים כאן בקרוב." />}
        />
        <Route
          path="impact"
          element={<ComingSoon title="Impact בבנייה" description="מעקב תרומות ובחירות פרויקטים ברמת הארגון נמצא כאן בקרוב." />}
        />
        <Route
          path="reports"
          element={<ComingSoon title="דוחות בבנייה" description="ייצוא נתונים ודוחות תקופתיים נמצאים כאן בקרוב." />}
        />
        <Route
          path="settings"
          element={<ComingSoon title="הגדרות בבנייה" description="פרטי הארגון והרשאות מנהל נמצאים כאן בקרוב." />}
        />
      </Route>
    </Routes>
  );
}
