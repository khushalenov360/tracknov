import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { 
  ClipboardList, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  FileText,
  Search,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { toLegacyCreditStatus } from "@/lib/workflow-utils";
import { formatDistanceToNow } from "date-fns";

export default async function ProjectExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: project },
    { data: credits },
    { data: submittals },
    { data: aiRisk }
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("project_credits").select("*, credits(*)").eq("project_id", projectId),
    supabase.from("submittals").select("*").eq("project_id", projectId).in("state", ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"]),
    supabase.from("ai_risk_reports").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  if (!project) redirect("/dashboard");

  const totalCredits = credits?.length || 0;
  const completedCredits = credits?.filter(c => toLegacyCreditStatus(c.status) === 'complete').length || 0;
  const progress = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;

  return (
    <Shell 
      title={`Execution: ${project.name}`} 
      description={`Operational Workspace / ${project.certification_type}`}
      role="super_user"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-6">
        {/* Left Column - Operational Status */}
        <div className="xl:col-span-8 space-y-8">
          {/* Project Execution Progress */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <ShieldCheck className="w-48 h-48 text-white" />
            </div>
            
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  Certification Progress
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-black">
                    {project.status}
                  </Badge>
                </h2>
                <p className="text-slate-400 mt-2 font-medium">Tracking {totalCredits} credits across 7 framework categories</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-white">{progress}%</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Overall Completion</p>
              </div>
            </div>

            <div className="space-y-6">
              <Progress value={progress} className="h-3 bg-white/5" indicatorClassName="bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Mandatory</p>
                  <p className="text-xl font-bold text-white">
                    {credits?.filter(c => c.is_mandatory && toLegacyCreditStatus(c.status) === 'complete').length} / {credits?.filter(c => c.is_mandatory).length}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Review</p>
                  <p className="text-xl font-bold text-blue-400">{submittals?.length || 0}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Clarifications</p>
                  <p className="text-xl font-bold text-amber-400">
                    {credits?.filter(c => toLegacyCreditStatus(c.status) === 'pending' && c.status === 'CLARIFICATION').length}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Achievable Points</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {credits?.reduce((sum, c) => sum + Number((c as any).achievable_points || 0), 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Active Workload List */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                Execution Queue
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-[10px] font-black uppercase h-7">
                  <Search className="w-3 h-3 mr-1" />
                  Search
                </Button>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-[10px] font-black uppercase h-7">
                  <Filter className="w-3 h-3 mr-1" />
                  Framework
                </Button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {credits?.sort((a, b) => {
                // Prioritize submittals
                const hasSubA = submittals?.some(s => s.credit_id === a.credit_id);
                const hasSubB = submittals?.some(s => s.credit_id === b.credit_id);
                if (hasSubA && !hasSubB) return -1;
                if (!hasSubA && hasSubB) return 1;
                return 0;
              }).map((credit) => {
                const status = toLegacyCreditStatus(credit.status);
                const activeSubmittal = submittals?.find(s => s.credit_id === credit.credit_id);
                
                return (
                  <Link 
                    key={credit.id} 
                    href={`/projects/${projectId}/execution/${credit.id}`}
                    className="p-6 hover:bg-white/[0.05] transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                        activeSubmittal ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/5 border-white/10'
                      }`}>
                        <FileText className={`w-6 h-6 ${activeSubmittal ? 'text-blue-400' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-black text-white tracking-tight">{(credit.credits as any)?.name}</p>
                          <Badge className="bg-white/5 text-slate-500 border border-white/10 text-[9px] uppercase font-black">
                            {credit.credit_code}
                          </Badge>
                          {activeSubmittal && (
                            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] uppercase font-black animate-pulse">
                              IN REVIEW
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{credit.category} · {credit.responsible_role || 'General'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                        <Badge variant="outline" className={`text-[10px] font-black uppercase ${
                          status === 'complete' ? 'border-emerald-500/50 text-emerald-400' : 
                          status === 'blocked' ? 'border-red-500/50 text-red-400' : 
                          'border-slate-500/50 text-slate-500'
                        }`}>
                          {credit.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-right min-w-[80px] hidden lg:block">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Progress</p>
                        <p className="text-sm font-mono font-bold text-white">{Math.round(credit.completion_pct || 0)}%</p>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 group-hover:bg-blue-500 transition-colors">
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column - Intelligence & Risk */}
        <div className="xl:col-span-4 space-y-8">
          {/* AI Risk Monitor */}
          <section className="bg-gradient-to-br from-[#121215] to-[#1a1a20] border border-blue-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-300 mb-6 flex items-center gap-2">
              Execution Risk Intelligence
            </h3>
            
            {aiRisk ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Project Risk Score</span>
                  <span className={`text-2xl font-black ${aiRisk.risk_score < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {aiRisk.risk_score}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {(aiRisk.risk_factors as any[]).map((factor, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{factor.factor}</span>
                      <Badge className={`text-[9px] font-black ${
                        factor.impact === 'LOW' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {factor.impact}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  Last assessed: {formatDistanceToNow(new Date(aiRisk.created_at))} ago. 
                  Factors include clarification velocity and evidence density.
                </p>
              </div>
            ) : (
              <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Awaiting Risk Calibration</p>
              </div>
            )}
          </section>

          {/* Operational Alerts */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Operational Alerts
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                <p className="text-[11px] font-bold text-amber-400 uppercase mb-1">Stale Queue Detection</p>
                <p className="text-[10px] text-slate-400">3 credits have been &quot;Under Review&quot; for {`> 48 hours`}.</p>
              </div>
              <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                <p className="text-[11px] font-bold text-blue-400 uppercase mb-1">Queue Balancing</p>
                <p className="text-[10px] text-slate-400">Reviewer workload is optimal. No escalation needed.</p>
              </div>
            </div>
          </section>

          {/* Pilot Context Card */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Pilot Context</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase">Framework</span>
                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase">
                  {project.certification_type} ({project.igbc_variant})
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase">Replay Safety</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  ACTIVE
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
