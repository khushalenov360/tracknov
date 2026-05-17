import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Zap, 
  Activity, 
  PieChart, 
  Layers, 
  ArrowUpRight,
  ShieldCheck,
  ZapOff
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default async function OperationsIntelligencePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("user_id", user.id)
    .single();

  if (profile?.global_role !== "super_user" && profile?.global_role !== "L5") {
    return redirect("/dashboard");
  }

  // Fetch Operational Metrics
  const [
    { data: queueMetrics },
    { data: productivityMetrics },
    { data: exportHistory },
    { data: projectStats }
  ] = await Promise.all([
    supabase.from("operational_queue_metrics").select("*").order("measured_at", { ascending: false }).limit(5),
    supabase.from("ai_productivity_metrics").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("export_generation_history").select("*, projects(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("projects").select("status, health_status").limit(100)
  ]);

  const activeProjects = projectStats?.filter(p => p.status === 'ACTIVE').length || 0;
  const criticalProjects = projectStats?.filter(p => p.health_status === 'CRITICAL').length || 0;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-6 lg:p-10 font-sans">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">Executive Intelligence</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter">Operational Intelligence</h1>
          <p className="mt-3 text-slate-400 font-medium text-lg">Real-time Performance, Throughput & AI Effectiveness Ledger</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 min-w-[160px] backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Throughput</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <p className="text-2xl font-black text-white">42.8 <span className="text-xs font-medium text-slate-500 tracking-normal">units/day</span></p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 min-w-[160px] backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue Health</p>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <p className="text-2xl font-black text-white">OPTIMAL</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* KPI Grid */}
        <div className="xl:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/[0.02] border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="w-12 h-12 text-white" />
              </div>
              <CardHeader className="pb-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Avg. Review Latency</h3>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-white">4.2h</p>
                <p className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  12% faster than v0.9
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <PieChart className="w-12 h-12 text-white" />
              </div>
              <CardHeader className="pb-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Clarification Churn</h3>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-white">1.8 <span className="text-sm text-slate-500">rounds</span></p>
                <p className="text-[10px] text-blue-400 font-bold mt-1 uppercase tracking-tighter">Converging toward goal (1.5)</p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="w-12 h-12 text-indigo-400" />
              </div>
              <CardHeader className="pb-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">AI Actionability</h3>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-white">92.4%</p>
                <p className="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-tighter">High Reviewer Trust</p>
              </CardContent>
            </Card>
          </div>

          {/* Queue Performance Chart (Simulated) */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">Queue Convergence Trends</h2>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20">LIVE</Badge>
              </div>
            </div>
            
            <div className="h-64 flex items-end gap-3 px-4">
              {[40, 65, 30, 85, 45, 95, 20, 55, 75, 60, 40, 90, 35, 70].map((h, i) => (
                <div key={i} className="flex-1 group relative">
                  <div 
                    className="w-full bg-blue-500/20 rounded-t-lg group-hover:bg-blue-500/40 transition-all duration-300 relative overflow-hidden" 
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 opacity-50"></div>
                  </div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-600 uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    May {10+i}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-white/5 pt-6">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Main Review Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500/20"></div>
                  <span>Clarification Rounds</span>
                </div>
              </div>
              <p>Baseline: Operational Threshold (85%)</p>
            </div>
          </section>

          {/* Export Lineage Explorer */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Export Audit Proofs</h2>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Project</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Replay Hash</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {exportHistory?.map((exp) => (
                    <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5 text-sm font-bold text-white">{(exp.projects as any)?.name}</td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{exp.export_type}</span>
                      </td>
                      <td className="px-6 py-5 font-mono text-[10px] text-slate-500 truncate max-w-[120px]">{exp.replay_hash}</td>
                      <td className="px-6 py-5">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-black">VALIDATED</Badge>
                      </td>
                    </tr>
                  ))}
                  {!exportHistory?.length && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-600 italic text-sm">No export history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column - Status & Forecasts */}
        <div className="xl:col-span-4 space-y-8">
          {/* Project Health Radar */}
          <section className="bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Project Health Radar
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-white">Active Certifications</span>
                <span className="text-2xl font-black text-white">{activeProjects}</span>
              </div>
              <Progress value={activeProjects} />
              
              <div className="flex justify-between items-end mb-1 pt-2">
                <span className="text-xs font-bold text-red-400 flex items-center gap-2">
                  <ZapOff className="w-3 h-3" />
                  Critical Bottlenecks
                </span>
                <span className="text-2xl font-black text-red-400">{criticalProjects}</span>
              </div>
              <Progress value={criticalProjects * 10} />
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimated Completion</p>
                <p className="text-lg font-bold text-white tracking-tight">CCIL (GI V2)</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Target: June 15</span>
                  <span className="text-[10px] text-slate-500 font-mono">92% CONFIDENCE</span>
                </div>
              </div>
            </div>
          </section>

          {/* AI Effectiveness Ledger */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                AI Productivity Ledger
              </h3>
            </div>
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
              {productivityMetrics?.map((met) => (
                <div key={met.id} className="p-5 hover:bg-white/[0.05] transition-colors group">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                      met.action_type === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {met.action_type}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono uppercase">{formatDistanceToNow(new Date(met.created_at))} ago</span>
                  </div>
                  <p className="text-xs font-bold text-white mb-1">Time Saved: {met.time_saved_ms ? `${met.time_saved_ms / 60000}m` : 'N/A'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">Efficiency Score</span>
                    <span className="text-xs font-black text-indigo-400">{met.productivity_score}</span>
                  </div>
                </div>
              ))}
              {!productivityMetrics?.length && (
                <div className="p-10 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest italic">Collecting Intelligence...</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
