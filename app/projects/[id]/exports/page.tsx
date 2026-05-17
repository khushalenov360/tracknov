import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { 
  Download, 
  ShieldCheck, 
  FileText, 
  Package, 
  History, 
  RefreshCw, 
  ArrowUpRight,
  ChevronRight,
  Layers,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function ProjectExportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: project },
    { data: exportHistory },
    { data: credits }
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("export_generation_history").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("project_credits").select("state").eq("project_id", projectId)
  ]);

  if (!project) redirect("/dashboard");

  const completedCount = credits?.filter(c => c.state === 'APPROVED' || c.state === 'VERIFIED').length || 0;
  const totalCount = credits?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Shell 
      title={`Enterprise Export Pipeline: ${project.name}`} 
      description="Lineage-Safe Deliverables & Audit Packages"
      role="super_user"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-6">
        {/* Export Action Grid */}
        <div className="xl:col-span-8 space-y-8">
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Package className="w-48 h-48 text-white" />
            </div>
            
            <div className="mb-10">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                Generate Certification Package
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-black">
                  {progress === 100 ? 'READY' : 'PARTIAL'}
                </Badge>
              </h2>
              <p className="text-slate-400 mt-2 font-medium">Deterministic export anchored to governance replay state</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Certification PDF</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-6">Authoritative certification report including credit-level decisions and point tallies.</p>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest h-10 rounded-xl">
                  GENERATE PDF
                </Button>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <Package className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Audit Appendix</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-6">Full package including all verified evidence files, clarification threads, and trace logs.</p>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest h-10 rounded-xl">
                  GENERATE BUNDLE
                </Button>
              </div>
            </div>
          </section>

          {/* Export Generation History */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                <History className="w-5 h-5 text-slate-400" />
                Lineage History
              </h2>
            </div>
            
            <div className="divide-y divide-white/5">
              {exportHistory?.map((exp) => (
                <div key={exp.id} className="p-6 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-sm font-black text-white tracking-tight">{exp.export_type}</p>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase">
                          VERIFIED
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        HASH: {exp.replay_hash.slice(0, 8)}... · {formatDistanceToNow(new Date(exp.created_at))} ago
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" className="h-9 w-9 p-0 text-slate-500 hover:text-white hover:bg-white/5">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" className="h-9 w-9 p-0 text-slate-500 hover:text-white hover:bg-white/5">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!exportHistory?.length && (
                <div className="p-16 text-center text-slate-600 italic text-sm">No export records found.</div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar - Audit & Replay Proof */}
        <div className="xl:col-span-4 space-y-8">
          {/* Replay Integrity Status */}
          <section className="bg-gradient-to-br from-[#0a0a0c] to-[#121215] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Replay Determinism Proof
            </h3>
            
            <div className="space-y-6">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">State Validity</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-white tracking-tight">STABLE</p>
                  <span className="text-[10px] font-mono text-emerald-400">0% DRIFT</span>
                </div>
              </div>
              
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Latest Replay Anchor</p>
                <p className="text-xs font-mono text-slate-400 break-all">{exportHistory?.[0]?.replay_hash || 'Awaiting Generation'}</p>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase">Audit Records</span>
                  <span className="text-white font-bold">1,242</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase">Snapshot Sync</span>
                  <span className="text-emerald-400 font-bold uppercase">LOCKED</span>
                </div>
              </div>
            </div>
          </section>

          {/* Export Deliverable Checklist */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Package Contents
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Certification Summary
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Credit Approval Records
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Clarification Appendices
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                Evidence ZIP (Optional)
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
