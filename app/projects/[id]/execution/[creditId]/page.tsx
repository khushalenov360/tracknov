import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  History,
  FileSearch,
  BookOpen
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { toLegacyCreditStatus } from "@/lib/workflow-utils";
import { EvidenceExplorer } from "@/components/project/EvidenceExplorer";
import { formatDistanceToNow } from "date-fns";

export default async function CreditExecutionDetailPage({ params }: { params: Promise<{ id: string, creditId: string }> }) {
  const { id: projectId, creditId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: project },
    { data: projectCredit },
    { data: submittals },
    { data: documents },
    { data: aiRecommendations },
    { data: duplicateReports }
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("project_credits").select("*, credits(*)").eq("id", creditId).single(),
    supabase.from("submittals").select("*, profiles!submittals_created_by_fkey(full_name, email)").eq("project_credit_id", creditId).order("iteration", { ascending: false }),
    supabase.from("project_document").select("*").eq("project_credit_id", creditId),
    supabase.from("ai_recommendation_logs").select("*").eq("project_id", projectId).eq("payload->>project_credit_id", creditId),
    supabase.from("ai_duplicate_evidence_reports").select("*").eq("project_id", projectId)
  ]);

  if (!project || !projectCredit) redirect(`/projects/${projectId}/execution`);

  const activeSubmittal = submittals?.find(s => s.state === 'SUBMITTED' || s.state === 'UNDER_REVIEW' || s.state === 'RESUBMITTED');
  const creditStatus = toLegacyCreditStatus(projectCredit.status);
  const categories = Array.from(new Set(documents?.map(d => d.doc_category) || []));

  return (
    <Shell 
      title={(projectCredit.credits as any)?.name} 
      description={`Credit Execution / ${projectCredit.category}`}
      role="super_user"
    >
      <div className="flex flex-col h-[calc(100vh-180px)] mt-6">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-6 bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}/execution`}>
              <Button variant="ghost" className="w-9 h-9 p-0 text-slate-500 hover:text-white hover:bg-white/5">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <Badge className="bg-white/5 text-slate-500 border border-white/10 text-[10px] uppercase font-black">
                  {projectCredit.credit_code}
                </Badge>
                <h2 className="text-lg font-black text-white">{(projectCredit.credits as any)?.name}</h2>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className={`text-[11px] font-black uppercase px-3 py-1 ${
              creditStatus === 'complete' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
              creditStatus === 'blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {projectCredit.status.replace(/_/g, ' ')}
            </Badge>
            <div className="w-px h-6 bg-white/10 mx-2" />
            <Button className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-widest px-6 rounded-xl">
              SUBMIT DECISION
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Left Column - Evidence Explorer */}
          <div className="xl:col-span-3 h-full overflow-hidden flex flex-col">
            <EvidenceExplorer 
              documents={documents || []} 
              categories={categories} 
              onSelect={(doc) => {}} 
              duplicateReports={duplicateReports || []}
            />
          </div>

          {/* Center Column - Execution & Analysis */}
          <div className="xl:col-span-6 h-full flex flex-col gap-6 overflow-y-auto no-scrollbar">
            {/* Active Submittal / Workround */}
            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileSearch className="w-4 h-4" />
                    Active Work Round
                  </h3>
                  {activeSubmittal && (
                    <p className="text-xs text-blue-400 mt-1 font-bold">ROUND {activeSubmittal.iteration} · Submitted by {(activeSubmittal.profiles as any)?.full_name}</p>
                  )}
                </div>
                {activeSubmittal && (
                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black">
                    {activeSubmittal.state}
                  </Badge>
                )}
              </div>

              {activeSubmittal ? (
                <div className="space-y-6">
                  <div className="p-5 bg-black/40 rounded-2xl border border-white/5">
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      {activeSubmittal.description || 'No submittal description provided by the consultant.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Button variant="secondary" className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl group">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Approve</span>
                    </Button>
                    <Button variant="secondary" className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl group">
                      <MessageSquare className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clarify</span>
                    </Button>
                    <Button variant="secondary" className="h-20 flex-col gap-2 bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl group">
                      <AlertCircle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reject</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-sm font-bold text-slate-500">No active submittal for review.</p>
                  <p className="text-[10px] text-slate-600 mt-2 uppercase font-black">Waiting for consultant upload</p>
                </div>
              )}
            </section>

            {/* Framework Requirements & Guidance */}
            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                <BookOpen className="w-4 h-4" />
                Framework Guidance
              </h3>
              <div className="space-y-6">
                <div className="p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                  <p className="text-xs font-bold text-blue-300 uppercase mb-3">Verification Mandatory List</p>
                  <div className="space-y-2">
                    {((projectCredit.credits as any)?.documents_required || []).map((req: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-[11px]">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        </div>
                        <span className="text-slate-300">{req.label || req.type}</span>
                        {req.required && <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] h-3 px-1">MANDATORY</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-3">Submission Summary</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {(projectCredit.credits as any)?.documentation_summary || 'No detailed framework guidance available for this credit.'}
                  </p>
                </div>
              </div>
            </section>

            {/* Submittal History / Clarification Timeline */}
            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-8">
                <History className="w-4 h-4" />
                Execution Timeline
              </h3>
              <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                {submittals?.map((sub, i) => (
                  <div key={sub.id} className="relative pl-10">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 bg-[#0a0a0c] flex items-center justify-center z-10 ${
                      sub.state === 'APPROVED' ? 'border-emerald-500' : 'border-blue-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        sub.state === 'APPROVED' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} />
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-tight">Round {sub.iteration} · {sub.state}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium italic">{(sub.profiles as any)?.full_name} · {formatDistanceToNow(new Date(sub.created_at))} ago</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[11px] text-slate-400 leading-relaxed italic line-clamp-2">"{sub.description || 'No description'}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - AI Recommendations & Insights */}
          <div className="xl:col-span-3 h-full overflow-y-auto no-scrollbar space-y-6">
            <section className="bg-gradient-to-br from-[#121215] to-[#1a1a20] border border-indigo-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-6 flex items-center gap-2">
                AI Harita Insights
              </h3>
              
              <div className="space-y-4">
                {aiRecommendations?.map((rec) => (
                  <div key={rec.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">{rec.recommendation_type.replace(/_/g, ' ')}</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                      {rec.reasoning}
                    </p>
                    <Button variant="ghost" className="w-full mt-3 h-7 text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      APPLY INSIGHT
                    </Button>
                  </div>
                ))}
                {!aiRecommendations?.length && (
                  <div className="p-6 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Scanning Context...</p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Operational Proofs
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Trace Status</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] h-3.5">ACTIVE</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Causality Link</span>
                  <span className="text-[9px] font-mono text-slate-600">6f2a...8b1e</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Replay Safe</span>
                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] h-3.5">CERTIFIED</Badge>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Shell>
  );
}
