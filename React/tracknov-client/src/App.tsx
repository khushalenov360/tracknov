import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Shell } from './components/shell';
import { GlobalHarita } from './components/assistant/global-harita';
import { ProjectTabs } from './components/project/ProjectTabs';
import { Badge } from './components/ui-lib/ui/badge';
import { ComplianceMatrix } from './components/ComplianceMatrix';
import { DocumentAudit } from './components/DocumentAudit';
import { supabase } from './lib/supabaseClient';
import { LoginPage } from './pages/LoginPage';

function mandatoryCode(creditCode: string, mandatory: boolean) {
  if (!mandatory || creditCode.includes("MR")) {
    return creditCode;
  }
  const parts = creditCode.split(" ");
  return `${parts[0]} MR ${parts.slice(1).join(" ")}`.trim();
}

function LegacyCreditsPage({ projectId }: { projectId: string }) {
  const [category, setCategory] = useState<string | null>(null);

  // Static mockup data to mimic the production layout
  const stats = {
    categories: [
      { key: "EDA" },
      { key: "WC" },
      { key: "EE" },
      { key: "IM" },
      { key: "IE" },
      { key: "IID" },
    ]
  };

  const filteredCredits = [
    {
      id: "credit-1",
      credit_code: "EDA Credit 1",
      credit_name: "Eco Vision for Interior Design",
      is_mandatory: false,
      state: "approved",
      available_points: 1,
      responsible_role: "ARCHITECT",
      remarks: [{ body: "Approved by IGBC committee." }]
    },
    {
      id: "credit-2",
      credit_code: "IE Mandatory Requirement 1",
      credit_name: "Optimise Circulation Spaces",
      is_mandatory: true,
      state: "pending",
      available_points: 0,
      responsible_role: "PROJECT_ADMIN",
      remarks: [{ body: "Awaiting uploaded floor plan." }]
    },
    {
      id: "credit-3",
      credit_code: "IID Credit 1",
      credit_name: "Occupancy in a Green Facility",
      is_mandatory: false,
      state: "blocked",
      available_points: 2,
      responsible_role: "MEP",
      remarks: [{ body: "Missing calculation sheets." }]
    }
  ];

  return (
    <div className="space-y-4 text-left animate-page-enter">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setCategory(null)}
            className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-lg border ${
              !category
                ? "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
            }`}
          >
            All Credits
          </button>
          {stats.categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`whitespace-nowrap px-3 py-1 text-xs font-bold rounded-lg border ${
                category === c.key
                  ? "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
            >
              {c.key}
            </button>
          ))}
        </div>
        <Badge className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-xs shrink-0 mb-2">
          {filteredCredits.length} Credits Filtered
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCredits.map((credit: any) => {
          const isBlocked = credit.state === "blocked";
          const stateColorClass = isBlocked ? "state-critical" : credit.state === "approved" ? "state-approved" : "state-pending";
          return (
            <div key={credit.id} className={`surface-card p-5 flex flex-col space-y-4 hover:border-[var(--color-green)] transition-all`}>
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1">
                  <span className="font-mono font-black text-[var(--color-green)] text-xs block">
                    {mandatoryCode(credit.credit_code, credit.is_mandatory)}
                  </span>
                  <h3 className="font-bold text-[var(--color-text-primary)] leading-snug">
                    {credit.credit_name}
                  </h3>
                </div>
                <Badge className={`shrink-0 ${stateColorClass}`}>
                  {credit.state.toUpperCase()}
                </Badge>
              </div>
              
              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                  <span>Points</span>
                  <strong className="text-[var(--color-text-primary)]">{Number(credit.available_points ?? 0).toFixed(1)}</strong>
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--color-text-secondary)]">
                  <span>Responsibility</span>
                  <strong className="text-[var(--color-text-primary)] uppercase">
                    {credit.responsible_role.replace("_", " ")}
                  </strong>
                </div>
                {credit.remarks?.[0]?.body && (
                  <div className="bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)] mt-2">
                    {isBlocked ? (
                      <span className="text-[var(--color-red)] font-bold flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{credit.remarks?.[0]?.body}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-tertiary)] font-medium text-xs line-clamp-2">
                        {credit.remarks?.[0]?.body}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--color-border)] flex gap-2">
                <Link
                  to={`/project/${projectId}/credit/${credit.id}`}
                  className="w-1/2 flex items-center justify-center py-2 px-4 bg-[var(--color-surface-2)] hover:bg-[var(--color-green-soft)] text-[var(--color-text-primary)] hover:text-[var(--color-green)] text-xs font-bold rounded-lg border border-[var(--color-border)] hover:border-[var(--color-green-light)] transition-colors"
                >
                  Document Audit
                </Link>
                <Link
                  to={`/project/${projectId}`}
                  className="w-1/2 flex items-center justify-center py-2 px-4 bg-[var(--color-surface-2)] hover:bg-[var(--color-green-soft)] text-[var(--color-text-primary)] hover:text-[var(--color-green)] text-xs font-bold rounded-lg border border-[var(--color-border)] hover:border-[var(--color-green-light)] transition-colors"
                >
                  Compliance Matrix
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-8rem)] bg-[var(--color-surface)]">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">{title}</h2>
        <p className="text-[var(--color-text-secondary)] max-w-md mx-auto">
          This module is currently under active development. Check back soon for updates to the {title} engine.
        </p>
      </div>
    </div>
  );
}

function MainLayout({ email }: { email?: string }) {
  const haritaPanel = <GlobalHarita />;

  return (
    <Shell
      title={
        <div className="flex items-center gap-2">
          <span>Bhavarkua</span>
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
            ATTENTION_NEEDED
          </Badge>
        </div>
      }
      description="IGBC Green Interiors / Target Certified"
      harita={haritaPanel}
      email={email}
      notificationCount={3}
    >
      <ProjectTabs projectId="b73d7310-df16-4d26-b6c8-61bebb197410" />
      <Routes>
        <Route path="/" element={<LegacyCreditsPage projectId="b73d7310-df16-4d26-b6c8-61bebb197410" />} />
        <Route path="/project/:projectId" element={<ComplianceMatrix />} />
        <Route path="/project/:projectId/credit/:creditId" element={<DocumentAudit />} />
        
        {/* Module Placeholders */}
        <Route path="/dashboard" element={<PlaceholderPage title="Command Dashboard" />} />
        <Route path="/projects" element={<PlaceholderPage title="Project Directory" />} />
        <Route path="/members" element={<PlaceholderPage title="Team Members" />} />
        <Route path="/tasks" element={<PlaceholderPage title="Task Management" />} />
        <Route path="/review-queue" element={<PlaceholderPage title="Review Queue" />} />
        <Route path="/executive-reports" element={<PlaceholderPage title="Executive Reports" />} />
        <Route path="/admin" element={<PlaceholderPage title="Administration Panel" />} />

        <Route path="*" element={<LegacyCreditsPage projectId="b73d7310-df16-4d26-b6c8-61bebb197410" />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session && location.pathname !== '/login') {
        navigate('/login');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && location.pathname !== '/login') {
        navigate('/login');
      } else if (session && location.pathname === '/login') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-4 border-[var(--color-green)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={session ? <MainLayout email={session.user?.email} /> : null} />
    </Routes>
  );
}
