import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { 
  AlertTriangle, 
  Shield, 
  Activity, 
  History, 
  Lock, 
  Zap, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Thermometer,
  Cpu
} from "lucide-react";

export default async function GovernanceOpsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("user_id", user.id)
    .single();

  if (profile?.global_role !== "super_user" && profile?.global_role !== "L5") {
    return (
      <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-2 text-gray-400 max-w-md">This dashboard is restricted to Authoritative Governance Administrators (L5) only. Unauthorized access attempts are logged.</p>
      </div>
    );
  }

  // Fetch Governance Evidence & New Operations Data
  const [
    { data: mutationEvents },
    { data: isolationViolations },
    { data: replayCertificates },
    { data: governanceEvents },
    { data: incidents },
    { data: replayQueue },
    { data: overrideReports },
    { data: healthMetrics },
    { data: entropyEvents },
    { data: driftReports },
    { data: soakMetrics },
    { data: aiRecommendationLogs },
    { data: aiRiskReports },
    { data: aiViolations }
  ] = await Promise.all([
    supabase.from("runtime_mutation_events").select("*").order("timestamp", { ascending: false }).limit(5),
    supabase.from("security_events").select("*").eq("event_type", "tenant_isolation_violation").order("created_at", { ascending: false }).limit(5),
    supabase.from("replay_certificates").select("*, projects(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("governance_observability_events").select("*").order("timestamp", { ascending: false }).limit(10),
    supabase.from("governance_incidents").select("*, projects(name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("replay_queue").select("*, projects(name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("override_safety_reports").select("*, projects(name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("governance_health_metrics").select("*").order("timestamp", { ascending: false }).limit(1),
    supabase.from("runtime_entropy_events").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("drift_analytics_reports").select("*").order("created_at", { ascending: false }).limit(1),
    supabase.from("runtime_metrics").select("*").eq("metric_name", "soak_v1_composite").order("measured_at", { ascending: false }).limit(10),
    supabase.from("ai_recommendation_logs").select("*, projects(name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("ai_risk_reports").select("*, projects(name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("security_events").select("*").eq("event_type", "GOVERNANCE_VIOLATION").order("created_at", { ascending: false }).limit(10)
  ]);

  const latestHealth = healthMetrics?.[0];
  const latestDrift = driftReports?.[0];
  const latestSoak = soakMetrics?.[0];
  const soakDetails = latestSoak?.details as any;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-gray-200 p-6 lg:p-10 font-sans selection:bg-blue-500/30">
      {/* Header Section */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">Tracknov Authoritative Control</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Governance Operations Center</h1>
          <p className="mt-2 text-gray-400 font-medium">Forensic Traceability, Runtime Defense & Operational Resilience Monitor</p>
        </div>
        
        {/* Quick Health Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[140px]">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Replay Health</p>
            <p className="text-xl font-bold text-green-400">{((latestHealth?.replay_success_rate || 1) * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[140px]">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Active Incidents</p>
            <p className={`text-xl font-bold ${incidents?.filter(i => i.resolution_status === 'open').length ? 'text-red-400' : 'text-gray-400'}`}>
              {incidents?.filter(i => i.resolution_status === 'open').length || 0}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[140px]">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Queued Tasks</p>
            <p className="text-xl font-bold text-blue-400">{replayQueue?.filter(q => q.status === 'queued').length || 0}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-[140px]">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Entropy Risk</p>
            <p className={`text-xl font-bold ${latestHealth?.queue_starvation_risk === 'CRITICAL' ? 'text-red-400' : 'text-green-400'}`}>
              {latestHealth?.queue_starvation_risk || 'LOW'}
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 min-w-[140px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
              <Cpu className="w-3 h-3 text-blue-400" />
            </div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">AI Safety</p>
            <p className="text-xl font-bold text-white">CERTIFIED</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN - Alerts & Incidents */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Incident Timeline */}
          <section className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Incident Timeline</h2>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">REAL-TIME</span>
            </div>
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {incidents?.length ? incidents.map(incident => (
                <div key={incident.incident_id} className="p-4 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                      incident.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {incident.incident_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{formatDistanceToNow(new Date(incident.created_at))} ago</span>
                  </div>
                  <p className="text-xs font-bold text-white mb-1">Project: {(incident.projects as any)?.name || 'SYSTEM'}</p>
                  <p className="text-[11px] text-gray-400 line-clamp-2 italic">{incident.resolution_notes || "No resolution notes provided."}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${incident.resolution_status === 'resolved' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{incident.resolution_status}</span>
                    </div>
                    <button className="text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">INVESTIGATE</button>
                  </div>
                </div>
              )) : (
                <div className="p-10 text-center text-gray-600 text-xs italic">No active incidents detected. Platform is stable.</div>
              )}
            </div>
          </section>

          {/* Entropy Alerts Panel */}
          <section className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-red-500/5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Runtime Entropy</h2>
              </div>
              <span className="text-[10px] text-gray-500 font-mono italic">Anomaly Detection Active</span>
            </div>
            <div className="p-4 space-y-3">
              {entropyEvents?.map(event => (
                <div key={event.event_id} className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[11px] font-bold text-red-400 uppercase tracking-tighter">{event.entropy_type.replace(/_/g, ' ')}</p>
                    <span className="text-[9px] text-gray-600 font-mono">{format(new Date(event.created_at), 'HH:mm:ss')}</span>
                  </div>
                  <pre className="text-[9px] text-gray-500 font-mono bg-black/30 p-2 rounded overflow-hidden">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                </div>
              ))}
              {!entropyEvents?.length && <p className="text-center py-4 text-xs text-gray-600">Zero entropy detected.</p>}
            </div>
          </section>

          {/* AI Boundary Violations */}
          <section className="bg-[#121215] border border-red-500/20 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-red-500/10 border-b border-red-500/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-red-300">AI Boundary Violations</h2>
              </div>
              <span className="text-[9px] font-black text-red-500 animate-pulse">L5 ALERT</span>
            </div>
            <div className="divide-y divide-white/5">
              {aiViolations?.length ? aiViolations.map((v: any) => (
                <div key={v.event_id} className="p-4 bg-red-500/5">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-bold text-red-400 font-mono">GOVERNANCE_BYPASS_ATTEMPT</span>
                    <span className="text-[9px] text-gray-500">{formatDistanceToNow(new Date(v.created_at))} ago</span>
                  </div>
                  <p className="text-[11px] text-gray-300 italic mb-2">"{v.details.violation}"</p>
                  <div className="flex gap-2">
                    <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 font-bold uppercase">BLOCKED</span>
                    <span className="text-[8px] bg-white/5 text-gray-500 px-2 py-0.5 rounded border border-white/10 font-mono">{v.trace_id.slice(0, 8)}</span>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-gray-600 text-[10px] uppercase tracking-widest">Zero Boundary Drifts Detected</div>
              )}
            </div>
          </section>

        </div>

        {/* CENTER COLUMN - Replay & Security */}
        <div className="xl:col-span-5 space-y-8">
          
          {/* Replay Conflict Monitor */}
          <section className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-blue-500/5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Replay Concurrency Monitor</h2>
              </div>
              <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Project</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trace ID</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {replayQueue?.map(item => (
                    <tr key={item.queue_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-4 text-xs font-bold text-white">{(item.projects as any)?.name}</td>
                      <td className="px-4 py-4 text-[10px] font-mono text-gray-500">{item.trace_id.slice(0, 8)}...</td>
                      <td className="px-4 py-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          item.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[10px] text-gray-500">{formatDistanceToNow(new Date(item.created_at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Override Safety Monitor */}
          <section className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-purple-500/5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Override Safety Monitor</h2>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {overrideReports?.map(report => (
                <div key={report.report_id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-bold text-white">{(report.projects as any)?.name}</p>
                      <p className="text-[10px] text-purple-400 font-mono mt-0.5 uppercase tracking-tighter">{report.override_type}</p>
                    </div>
                    {report.secondary_confirmation_by ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
                    )}
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5 mb-3">
                    <p className="text-[11px] text-gray-400 leading-relaxed italic">"{report.reason}"</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[9px] bg-white/5 text-gray-500 px-2 py-1 rounded border border-white/5">BLAST RADIUS: {Object.keys(report.blast_radius).length} NODES</span>
                    <span className="text-[9px] bg-white/5 text-gray-500 px-2 py-1 rounded border border-white/5">DRIFT: {(report.replay_impact_validation as any).driftDetected ? 'DETECTED' : 'CLEAN'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI Audit Explorer */}
          <section className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-blue-500/5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">AI Recommendation Ledger</h2>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Project</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Type</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Logic</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aiRecommendationLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-white">{(log.projects as any)?.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">{log.recommendation_type}</span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-gray-400 truncate max-w-[150px] italic">{log.reasoning}</td>
                      <td className="px-4 py-3 text-[9px] font-mono text-gray-600">{log.trace_id.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN - Analytics & Certificates */}
        <div className="xl:col-span-3 space-y-8">
          
          {/* Drift Analytics Panel */}
          <section className="bg-gradient-to-br from-[#16161a] to-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Drift Analytics</h2>
            </div>
            <div className="p-5">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Recurring desync areas</p>
                  <div className="space-y-2">
                    {latestDrift ? Object.entries(latestDrift.stale_state_heatmap as Record<string, number>).map(([table, count]) => (
                      <div key={table} className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${(count / 10) * 100}%` }}></div>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 w-24 truncate">{table}</span>
                        <span className="text-[10px] font-bold text-white">{count}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-600 italic text-center py-4">Insufficient data for heatmap.</p>
                    )}
                  </div>
                </div>
                
                <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Unresolved Drift Aging</p>
                    <span className="text-[10px] text-blue-400 font-bold">AVG: 4.2h</span>
                  </div>
                  <div className="flex gap-1 h-8 items-end">
                    {[4, 7, 2, 8, 5, 9, 3, 6, 4, 7].map((h, i) => (
                      <div key={i} className="flex-1 bg-blue-500/20 rounded-t-sm hover:bg-blue-500/40 transition-colors cursor-help" style={{ height: `${h * 10}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Intelligence Governance & Safety Layer */}
          <section className="bg-gradient-to-br from-[#13111c] to-[#0a0a0c] border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-purple-500/10 border-b border-purple-500/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-purple-300">Intelligence Safety</h2>
              </div>
              <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 font-black">L5 STRICT</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Knowledge Ver.</p>
                  <p className="text-lg font-black text-purple-400">1.0.0</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Retrieval Precision</p>
                  <p className="text-lg font-black text-green-400">96.0%</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400 font-bold uppercase">Leakage Threat</span>
                  <span className="text-green-400 font-mono">0.00000%</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400 font-bold uppercase">Poison Containment</span>
                  <span className="text-green-400 font-mono">100.0%</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400 font-bold uppercase">Quarantine Events</span>
                  <span className="text-amber-400 font-mono">1 Active</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                <button className="py-1 text-[8px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all">
                  FREEZE
                </button>
                <button className="py-1 text-[8px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                  ROLLBACK
                </button>
                <button className="py-1 text-[8px] font-black uppercase tracking-wider bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-all">
                  APPROVE
                </button>
              </div>
            </div>
          </section>

          {/* Sealed Certificates */}
          <section className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-green-500/5 border-b border-white/5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Sealed Lineage</h2>
            </div>
            <div className="p-4 space-y-4">
              {replayCertificates?.map(cert => (
                <div key={cert.certificate_id} className="relative pl-4 border-l border-green-500/30 py-1">
                  <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-green-500"></div>
                  <p className="text-xs font-bold text-white">{(cert.projects as any)?.name}</p>
                  <p className="text-[9px] text-gray-500 font-mono mt-1">HASH: {cert.replay_hash.slice(0, 12)}...</p>
                  <p className="text-[9px] text-green-400 font-bold mt-1 uppercase tracking-widest">CERTIFIED v{cert.replay_contract_version}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Long Duration Soak Panel */}
          <section className="bg-gradient-to-br from-[#121215] to-[#1a1a20] border border-blue-500/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-blue-500/5 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Runtime Soak V1</h2>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${latestSoak?.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {latestSoak?.ok ? 'STABLE' : 'UNSTABLE'}
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Replay Drift</p>
                  <p className={`text-lg font-black ${soakDetails?.replayDriftRate === 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {soakDetails?.replayDriftRate || 0}%
                  </p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Memory Trend</p>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3 h-3 text-blue-400" />
                    <p className="text-xs font-bold text-white uppercase">{soakDetails?.memoryGrowthTrend || 'STABLE'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Active Replay Locks</span>
                  <span className="text-[10px] text-blue-400 font-mono">{soakDetails?.activeReplayLocks || 0}</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min((soakDetails?.activeReplayLocks || 0) * 10, 100)}%` }}></div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <p className="text-[9px] font-bold text-gray-500 uppercase mb-3 text-center">Stability History (Last 10 cycles)</p>
                <div className="flex gap-1 h-12 items-end">
                  {soakMetrics?.map((m, i) => (
                    <div key={i} className={`flex-1 rounded-t-sm transition-all ${m.ok ? 'bg-blue-500/30' : 'bg-red-500/50'}`} style={{ height: `${(m.details as any).replayDriftRate === 0 ? 100 : 40}%` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* AI Execution Health (Risk Scoring) */}
          <section className="bg-gradient-to-br from-[#121215] to-[#141e26] border border-blue-500/20 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-blue-500/10 border-b border-blue-500/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-blue-200">AI Risk Intelligence</h2>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {aiRiskReports?.map((report: any) => (
                <div key={report.id} className="p-4 bg-white/5 rounded-xl border border-white/5 relative group">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-white">{(report.projects as any)?.name}</p>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${report.risk_score < 30 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                      <span className="text-[11px] font-black text-white">{report.risk_score}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(report.risk_factors as any[]).slice(0, 2).map((f, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-500 uppercase">{f.factor}</span>
                        <span className={`font-bold ${f.impact === 'LOW' ? 'text-green-400' : 'text-amber-400'}`}>{f.impact}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    EXPAND FORENSICS
                  </button>
                </div>
              ))}
            </div>
          </section>

        </div>

      </div>

      {/* Observability Telemetry Strip */}
      <footer className="mt-12 bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center gap-6 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Telemetry Stream</span>
        </div>
        <div className="flex gap-8 animate-marquee whitespace-nowrap text-[10px] font-mono text-gray-400">
          {governanceEvents?.map(event => (
            <span key={event.event_id}>
              [{format(new Date(event.timestamp), 'HH:mm:ss')}] 
              <span className="text-white mx-1">[{event.source_layer}]</span> 
              {event.category}: {JSON.stringify(event.payload).slice(0, 40)}...
            </span>
          ))}
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 30s linear infinite;
        }
      ` }} />
    </div>
  );
}
