import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepShell from '../../components/StepShell.jsx';
import { useOnboarding } from './OnboardingContext.jsx';

// Demo directory — will be replaced by a real org lookup once the backend exists.
const ORGANIZATIONS = [
  { id: 'abc', name: 'חברת ABC', kind: 'חברה פרטית' },
  { id: 'tlv', name: 'עיריית תל אביב', kind: 'רשות מקומית' },
  { id: 'technion', name: 'הטכניון', kind: 'מוסד אקדמי' },
  { id: 'hapoalim', name: 'בנק הפועלים', kind: 'חברה פרטית' },
  { id: 'clalit', name: 'קופת חולים כללית', kind: 'ארגון בריאות' },
  { id: 'haifa', name: 'עיריית חיפה', kind: 'רשות מקומית' },
  { id: 'checkpoint', name: 'צ׳ק פוינט', kind: 'חברת הייטק' },
];

export default function Organization() {
  const navigate = useNavigate();
  const { organization, setOrganization } = useOnboarding();
  const [query, setQuery] = useState(organization?.name ?? '');

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return ORGANIZATIONS;
    return ORGANIZATIONS.filter((org) => org.name.includes(q));
  }, [query]);

  const handleSelect = (org) => {
    setOrganization(org);
    setQuery(org.name);
  };

  return (
    <StepShell
      step={2}
      eyebrow="שלב 2 מתוך 3"
      title="לאיזה ארגון אתה שייך?"
      footer={
        <button
          type="button"
          className="btn-primary"
          disabled={!organization}
          onClick={() => navigate('/onboarding/connect')}
        >
          <span>המשך</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      }
    >
      <div className="search-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="הקלד שם חברה / ארגון"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (organization) setOrganization(null);
          }}
          aria-label="חיפוש ארגון"
        />
      </div>

      {results.length > 0 ? (
        <div className="org-list" role="radiogroup" aria-label="תוצאות חיפוש">
          {results.map((org) => {
            const selected = organization?.id === org.id;
            return (
              <button
                type="button"
                key={org.id}
                role="radio"
                aria-checked={selected}
                className={`org-row ${selected ? 'org-row--selected' : ''}`}
                onClick={() => handleSelect(org)}
              >
                <span className="org-row__badge" aria-hidden="true">{org.name.slice(0, 2)}</span>
                <span style={{ flex: 1, textAlign: 'right' }}>
                  <span className="org-row__label" style={{ display: 'block' }}>{org.name}</span>
                  <span className="org-row__meta">{org.kind}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="org-empty">לא נמצא ארגון בשם "{query}"</p>
      )}
    </StepShell>
  );
}
