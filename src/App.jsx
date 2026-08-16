import { Routes, Route, Outlet } from 'react-router-dom';
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
        <Route
          path="profile"
          element={<ComingSoon title="הפרופיל שלי בבנייה" description="ההישגים והנתונים האישיים נמצאים כאן בקרוב." />}
        />
      </Route>
    </Routes>
  );
}
