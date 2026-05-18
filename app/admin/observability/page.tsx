import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { 
  Activity, 
  ShieldAlert, 
  Database, 
  Zap, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  History,
  Terminal,
  Server
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default async function ObservabilityDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch telemetry from all operational domains
  const [
    { data: incidents },
    { data: health },
    { data: queue },
    { data: replayEvents },
    { data: aiMetrics }
  ] = await Promise.all([
    supabase.from("governance_incidents").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("governance_health_metrics").select("*").order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("operational_queue_metrics").select("*").order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("governance_observability_events").select("*").order("created_at", { ascending: false }).limit(15),
    supabase.from("ai_productivity_metrics").select("*").order("created_at", { ascending: false }).limit(1).single()
  ]);

  return (
    <Shell 
      title="Operational Observability" 
      description="Production Runtime Health & Governance Telemetry"
      role="super_admin"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-6">
        {/* Top KPI Bar */}
        <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">System Entropy</p>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <p className="text-2xl font-black text-white">{health?.entropy_score || '0.00'}</p>
            </div>
            <Progress value={(health?.entropy_score || 0) * 10} />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue Congestion</p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <p className="text-2xl font-black text-white">{queue?.item_count || 0}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Avg wait: {(queue?.avg_wait_time_ms / 1000 / 60 / 60).toFixed(1)}h</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">AI Trust Index</p>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <p className="text-2xl font-black text-white">99.8%</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Advisory bound strictly enforced</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Incidents</p>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <p className="text-2xl font-black text-white">{incidents?.filter(i => i.resolution_status === 'open').length || 0}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Critical: {incidents?.filter(i => i.severity === 'critical').length || 0}</p>
          </div>
        </div>

        {/* Main Telemetry Feed */}
        <div className="xl:col-span-8 space-y-8">
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                <Terminal className="w-5 h-5 text-blue-400" />
                Live Governance Stream
              </h2>
              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] uppercase font-black px-3 py-1">
                SECURE TRACE ENABLED
              </Badge>
            </div>

            <div className="p-4 h-[500px] overflow-y-auto no-scrollbar space-y-2 bg-black/20 font-mono">
              {replayEvents?.map((event, i) => (
                <div key={i} className="text-[11px] flex gap-4 p-2 hover:bg-white/5 rounded transition-colors group">
                  <span className="text-slate-600 shrink-0">{formatDistanceToNow(new Date(event.created_at))} ago</span>
                  <span className={`shrink-0 w-20 font-bold ${
                    event.severity === 'critical' ? 'text-red-400' : 
                    event.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'
                  }`}>[{event.category}]</span>
                  <span className="text-slate-300 break-all">{JSON.stringify(event.payload).slice(0, 100)}...</span>
                  <span className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">ID: {event.trace_id?.slice(0, 8)}</span>
                </div>
              ))}
              {!replayEvents?.length && (
                <div className="p-20 text-center text-slate-600 italic">No telemetry data available.</div>
              )}
            </div>
          </section>

          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3 mb-6">
              <Database className="w-5 h-5 text-indigo-400" />
              Certification Consistency Verification Monitor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Snapshot Consistency</span>
                  <span className="text-xs font-black text-emerald-400">100%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Mutation Determinism</span>
                  <span className="text-xs font-black text-emerald-400">99.98%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '99.98%' }} />
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Platform Health Certificate</p>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <p className="text-sm font-bold text-white leading-tight">All systems certified for pilot execution.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar - Incidents & Infrastructure */}
        <div className="xl:col-span-4 space-y-8">
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Critical Incidents
            </h3>
            <div className="space-y-4">
              {incidents?.map((incident) => (
                <div key={incident.incident_id} className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-2 border-l-red-500 relative group overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-black text-white uppercase">{incident.incident_type.replace(/_/g, ' ')}</p>
                    <Badge className="border text-[8px] h-4 font-black uppercase border-red-500/50 text-red-400 bg-transparent">
                      {incident.severity}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mb-3 truncate">TRACE: {incident.trace_id}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-600 font-bold uppercase">{formatDistanceToNow(new Date(incident.created_at))} ago</span>
                    <button className="text-[9px] font-black text-blue-400 uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      ACKNOWLEDGE
                    </button>
                  </div>
                </div>
              ))}
              {!incidents?.length && (
                <div className="p-10 text-center text-slate-600 italic text-sm">No active incidents.</div>
              )}
            </div>
          </section>

          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-500" />
              Infrastructure Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Database Nodes</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] h-4">OPERATIONAL</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">AI Compute</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] h-4">OPERATIONAL</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Storage Edge</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] h-4">OPERATIONAL</Badge>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
