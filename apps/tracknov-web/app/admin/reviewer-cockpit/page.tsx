import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { 
  Inbox, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Zap, 
  Users, 
  FileText, 
  ArrowUpRight,
  Filter,
  Search,
  LayoutDashboard,
  ClipboardList
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@tracknov/ui/ui/card";
import { Badge } from "@tracknov/ui/ui/badge";
import { Button } from "@tracknov/ui/ui/button";

export default async function ReviewerCockpitPage() {
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
      <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] text-white">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-2 text-slate-400 max-w-md">This cockpit is restricted to Authoritative Governance Administrators and Reviewers only.</p>
      </div>
    );
  }

  // Fetch Operational Data
  const [
    { data: submittalsInQueue },
    { data: activeAssignments },
    { data: pendingClarifications },
    { data: aiRecommendations },
    { data: recentActivity }
  ] = await Promise.all([
    supabase.from("submittals").select("*, projects(name), credits(name)").in("state", ["L1_REVIEW", "UNDER_L3_REVIEW", "RESUBMITTED"]).limit(10),
    supabase.from("submittals").select("*, projects(name), credits(name)").eq("created_by", user.id).limit(5),
    supabase.from("ai_clarification_drafts").select("*, projects(name), submittals(*)").eq("status", "draft").limit(5),
    supabase.from("ai_recommendation_logs").select("*, projects(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("reviewer_activity_metrics").select("*, projects(name)").eq("reviewer_id", user.id).order("created_at", { ascending: false }).limit(5)
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] p-6 lg:p-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-[var(--color-border)] pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <LayoutDashboard className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Operational Excellence</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Reviewer Cockpit</h1>
          <p className="mt-2 text-slate-400 font-medium">Authoritative Workspace for Enterprise Certification Execution</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search project or credit..." 
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
            />
          </div>
          <Button variant="secondary" className="border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-white/10 text-white">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column - Main Queue */}
        <div className="xl:col-span-8 space-y-8">
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="px-6 py-5 bg-[var(--color-surface-2)] border-b border-[var(--color-border)] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Inbox className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Active Review Queue</h2>
              </div>
              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {submittalsInQueue?.length || 0} PENDING
              </Badge>
            </div>
            
            <div className="divide-y divide-[var(--color-border)]">
              {submittalsInQueue?.length ? submittalsInQueue.map((item) => (
                <div key={item.id} className="p-5 hover:bg-[var(--color-border)] transition-all group cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/30 transition-colors">
                        <FileText className="w-5 h-5 text-indigo-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-none">{(item.projects as any)?.name}</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{(item.credits as any)?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase text-xs font-black">
                        {item.state}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1 font-mono uppercase">
                        {formatDistanceToNow(new Date(item.created_at))} ago
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[var(--color-surface-2)] text-slate-400 px-2 py-0.5 rounded border border-[var(--color-border)]">ROUND {item.iteration}</span>
                      <span className="text-xs bg-[var(--color-surface-2)] text-slate-400 px-2 py-0.5 rounded border border-[var(--color-border)] font-mono">{item.id.slice(0, 8)}</span>
                    </div>
                    <Button className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg px-4 h-8">
                      EXECUTE
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-500 italic text-sm">Review queue is empty. System healthy.</div>
              )}
            </div>
            
            <div className="p-4 bg-[var(--color-surface-2)] border-t border-[var(--color-border)] text-center">
              <Button variant="ghost" className="text-xs text-slate-400 hover:text-white font-bold">VIEW FULL QUEUE</Button>
            </div>
          </section>

          {/* Pending Clarifications */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="px-6 py-5 bg-amber-500/5 border-b border-[var(--color-border)] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">Draft Clarifications</h2>
              </div>
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black uppercase text-xs">
                ACTION REQUIRED
              </Badge>
            </div>
            <div className="p-6 space-y-4">
              {pendingClarifications?.map((draft) => (
                <div key={draft.id} className="p-4 bg-[var(--color-surface-2)] rounded-2xl border border-[var(--color-border)] hover:border-amber-500/30 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-bold text-white">{(draft.projects as any)?.name}</p>
                      <p className="text-xs text-amber-400 font-mono mt-0.5 uppercase tracking-tighter">SUGGESTED BY AI</p>
                    </div>
                    <Badge className="bg-[var(--color-surface-2)] text-slate-400 border border-[var(--color-border)] text-[9px]">DRAFT</Badge>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-[var(--color-border)] mb-4">
                    <p className="text-xs text-slate-400 leading-relaxed italic line-clamp-2">"{draft.draft_content}"</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-black h-7 border border-amber-500/20 px-3">EDIT & SEND</Button>
                    <Button variant="ghost" className="text-slate-500 hover:text-white text-xs font-black h-7 px-3">DISMISS</Button>
                  </div>
                </div>
              ))}
              {!pendingClarifications?.length && (
                <p className="text-center text-slate-500 text-xs py-4 italic">No pending draft clarifications.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="xl:col-span-4 space-y-8">
          {/* AI Productivity Widget */}
          <Card className="bg-indigo-600/10 border-indigo-500/30 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-indigo-500/20 bg-indigo-500/5">
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-300 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                AI Efficiency Boost
              </h3>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <p className="text-4xl font-black text-white">24%</p>
                <p className="text-xs text-indigo-300 font-bold uppercase mt-1">Throughput Increase</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Rec. Acceptance</span>
                  <span className="text-indigo-400 font-black">88%</span>
                </div>
                <div className="w-full h-1.5 bg-indigo-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: '88%' }}></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Avg. Time Saved</span>
                  <span className="text-indigo-400 font-black">12m / credit</span>
                </div>
                <div className="w-full h-1.5 bg-indigo-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: '65%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Projects */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                My Assignments
              </h3>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-black">ACTIVE</Badge>
            </div>
            <div className="p-2">
              {activeAssignments?.length ? activeAssignments.map((sub) => (
                <div key={sub.id} className="p-4 hover:bg-[var(--color-surface-2)] rounded-2xl transition-all group">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-white">{(sub.projects as any)?.name}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate max-w-[150px]">{(sub.credits as any)?.name}</p>
                    </div>
                    <Button variant="ghost" className="w-9 h-9 p-0 text-slate-600 group-hover:text-indigo-400">
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-600 text-xs uppercase font-bold tracking-widest italic">No Direct Assignments</div>
              )}
            </div>
          </section>

          {/* Operational Health Feed */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Operational History
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {recentActivity?.map((act) => (
                <div key={act.id} className="relative pl-6 border-l border-[var(--color-border)] py-1">
                  <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-indigo-500"></div>
                  <p className="text-xs font-bold text-white uppercase tracking-tight">{act.activity_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium italic">{(act.projects as any)?.name}</p>
                  <p className="text-[9px] text-slate-600 mt-1 font-mono uppercase">{formatDistanceToNow(new Date(act.created_at))} ago</p>
                </div>
              ))}
              {!recentActivity?.length && (
                <p className="text-center text-slate-600 text-xs font-bold uppercase py-4">No recent history</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
