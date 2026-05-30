import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { 
  UserPlus, 
  ShieldCheck, 
  Users, 
  Mail, 
  ChevronRight, 
  Search,
  Plus,
  BadgeCheck,
  Briefcase
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default async function ReviewerOnboardingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch projects and current reviewers
  const [
    { data: projects },
    { data: reviewers }
  ] = await Promise.all([
    supabase.from("projects").select("id, name, certification_type"),
    supabase.from("profiles").select("*, project_users(*)").eq("role", "super_user") // Assuming super_user is the reviewer role
  ]);

  return (
    <Shell 
      title="Reviewer Onboarding" 
      description="Enterprise Provisioning & Framework Specialization"
      role="super_admin"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-6">
        {/* Left Column - Invitation & Provisioning */}
        <div className="xl:col-span-7 space-y-8">
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3 mb-6">
              <UserPlus className="w-6 h-6 text-blue-400" />
              Invite New Reviewer
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <Input placeholder="John Doe" className="bg-white/5 border-white/10 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
                  <Input placeholder="john@enterprise.com" className="bg-white/5 border-white/10 h-12 rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Framework Specialization</label>
                <div className="grid grid-cols-2 gap-3">
                  {['GI_V1 (Bhavarkua)', 'GI_V2 (CCIL)', 'IGBC Health', 'LEED O+M'].map(fw => (
                    <Button key={fw} variant="secondary" className="justify-start gap-3 bg-white/5 border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 h-14 rounded-2xl group">
                      <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20">
                        <BadgeCheck className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-300">{fw}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                GENERATE INVITATION LINK
              </Button>
            </div>
          </section>

          {/* Active Reviewer Pool */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-400" />
                Active Reviewer Pool
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input placeholder="Filter reviewers..." className="pl-10 h-9 bg-white/5 border-white/10 text-xs w-48 rounded-lg" />
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {reviewers?.map((rev) => (
                <div key={rev.id} className="p-6 hover:bg-white/[0.05] transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-xl font-black text-white shadow-lg">
                      {rev.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{rev.full_name}</p>
                      <p className="text-xs text-slate-500 font-medium">{rev.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue Load</p>
                      <p className="text-xs font-mono font-bold text-white">{(rev.project_users as any[]).length} Projects</p>
                    </div>
                    <Button variant="ghost" className="w-9 h-9 p-0 text-slate-500 group-hover:text-white">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Provisioning Metrics */}
        <div className="xl:col-span-5 space-y-8">
          <section className="bg-gradient-to-br from-[#121215] to-[#1a1a20] border border-blue-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck className="w-32 h-32 text-blue-400" />
            </div>
            
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-8 flex items-center gap-2">
              Provisioning Policy
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight">Authoritative Assignment</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Reviewers are mapped to specific framework variants (GI_V1, GI_V2) based on certification authority.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight">Multi-Tenant Isolation</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Reviewers can only access projects explicitly provisioned to their account.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Available Licenses</span>
                  <span className="text-sm font-black text-white">12 / 20</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </section>

          {/* Onboarding Status Feed */}
          <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Pending Activation</h3>
            <div className="space-y-4">
              {[
                { name: 'Sarah Miller', stage: 'Credentials Pending', time: '2h ago' },
                { name: 'Mike Ross', stage: 'Walkthrough In-Progress', time: '5h ago' }
              ].map((pending, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-xs font-bold text-white">{pending.name}</p>
                    <p className="text-xs text-slate-500 font-medium uppercase mt-0.5">{pending.stage}</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase">
                    PENDING
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
