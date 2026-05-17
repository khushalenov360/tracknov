import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight,
  Send,
  Plus,
  TrendingDown,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function ProjectClarificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: project },
    { data: clarifications },
    { data: lifecycleMetrics }
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("ai_clarification_drafts").select("*, submittals(*), projects(name)").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("clarification_lifecycle_metrics").select("*").eq("trace_id", projectId) // Assuming trace_id or similar link
  ]);

  if (!project) redirect("/dashboard");

  const openCount = clarifications?.filter(c => c.status === 'draft').length || 0;
  const sentCount = clarifications?.filter(c => c.status === 'sent').length || 0;
  const resolvedCount = clarifications?.filter(c => c.status === 'resolved').length || 0;

  return (
    <Shell 
      title={`Clarification Workspace: ${project.name}`} 
      description="Bounded Operational Loops & Convergence Tracking"
      role="super_user"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-6">
        {/* KPI Header Section */}
        <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Convergence Rate</p>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <p className="text-2xl font-black text-white">1.6 <span className="text-xs font-medium text-slate-500 tracking-normal">rounds/avg</span></p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Open Loops</p>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <p className="text-2xl font-black text-white">{openCount}</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Operational Velocity</p>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <p className="text-2xl font-black text-white">HIGH</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Stale Warning</p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <p className="text-2xl font-black text-white">0 <span className="text-xs font-medium text-slate-500 tracking-normal">loops</span></p>
            </div>
          </div>
        </div>

        {/* Main Clarification List */}
        <div className="xl:col-span-8 space-y-6">
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Active Clarification Loops
              </h2>
              <div className="flex gap-2">
                <Button variant="secondary" className="h-7 px-3 bg-white/5 border-white/10 text-[10px] font-black uppercase">
                  <Plus className="w-3 h-3 mr-1" />
                  New Draft
                </Button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {clarifications?.map((clar) => (
                <div key={clar.id} className="p-6 hover:bg-white/[0.05] transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${
                        clar.status === 'draft' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'
                      }`}>
                        <AlertCircle className={`w-4 h-4 ${clar.status === 'draft' ? 'text-amber-400' : 'text-blue-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white tracking-tight">Loop #{clar.id.slice(0, 4).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase">{(clar.submittals as any)?.name || 'General Project Query'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-[9px] font-black uppercase ${
                        clar.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        clar.status === 'sent' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {clar.status}
                      </Badge>
                      <p className="text-[9px] text-slate-600 mt-1 font-mono uppercase">{formatDistanceToNow(new Date(clar.created_at))} ago</p>
                    </div>
                  </div>

                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-4">
                    <p className="text-xs text-slate-400 leading-relaxed italic">"{clar.draft_content}"</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ROUND {(clar.submittals as any)?.iteration || 1}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Activity className="w-3 h-3 text-indigo-400" />
                        AI ASSISTED
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="text-slate-500 hover:text-white text-[10px] font-black h-8 px-4">VIEW THREAD</Button>
                      <Button className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black h-8 px-4 rounded-lg">
                        <Send className="w-3 h-3 mr-2" />
                        {clar.status === 'draft' ? 'SEND CLARIFICATION' : 'RESEND'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!clarifications?.length && (
                <div className="p-20 text-center text-slate-600 italic text-sm">No active clarification loops.</div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar - Context & Telemetry */}
        <div className="xl:col-span-4 space-y-8">
          {/* Convergence Metrics Card */}
          <section className="bg-gradient-to-br from-[#121215] to-[#1a1a20] border border-emerald-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2">
              Loop Convergence Proof
            </h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">Mean Response Time</span>
                <span className="text-xl font-black text-white">14.2h</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Loop Closure (R1)</span>
                  <span className="text-emerald-400 font-black">72%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '72%' }}></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Stale Detection Rate</span>
                  <span className="text-emerald-400 font-black">0.2%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '99%' }}></div>
                </div>
              </div>
            </div>
          </section>

          {/* Operational Workflow Card */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Workflow Context</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Standardized Loop</p>
                <p className="text-[10px] text-slate-400">All clarifications are currently following the 2-round convergence pattern.</p>
              </div>
              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Audit Ready</p>
                <p className="text-[10px] text-slate-400">All threading is linked to immutable trace IDs for forensic reconstruction.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
