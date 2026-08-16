import { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [role, setRole] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [connectedProviders, setConnectedProviders] = useState([]);

  const toggleProvider = (id) => {
    setConnectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <OnboardingContext.Provider
      value={{
        role,
        setRole,
        organization,
        setOrganization,
        connectedProviders,
        toggleProvider,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
