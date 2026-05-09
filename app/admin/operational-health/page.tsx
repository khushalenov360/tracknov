import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function OperationalHealthPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // SECTION 13: Governance Integrity Check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "super_user") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2 text-gray-600">This dashboard is restricted to L5 Administrators (Super Users) only.</p>
      </div>
    );
  }

  // Fetch Stats
  const [
    { data: killSwitches },
    { data: failedNotifications },
    { data: failedExports },
    { data: reconciliationItems },
    { data: retryQueues },
  ] = await Promise.all([
    supabase.from("system_controls").select("*"),
    supabase.from("notification_outbox").select("*").in("status", ["FAILED", "DEAD_LETTER"]).limit(10),
    supabase.from("export_jobs").select("*").eq("status", "FAILED").limit(10),
    supabase.from("reconciliation_items").select("*").eq("status", "OPEN").limit(10),
    supabase.from("notification_outbox").select("status, count").in("status", ["PENDING", "RETRYING"]),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">L5 Operational Health Dashboard</h1>
        <p className="mt-2 text-gray-600">Enterprise Readiness & Governance Monitoring</p>
      </div>

      {/* Kill Switches */}
      <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Emergency Kill Switches
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {killSwitches?.map((control) => (
            <div key={control.feature_name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="font-medium capitalize">{control.feature_name}</p>
                <p className="text-xs text-gray-500">Status: {control.is_enabled ? 'Active' : 'SUSPENDED'}</p>
              </div>
              <button 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  control.is_enabled 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {control.is_enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Failed Tasks */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Runtime Failures</h2>
          
          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-medium">Failed Notifications</h3>
              <span className="text-xs text-gray-500">Last 10 items</span>
            </div>
            <div className="divide-y divide-gray-100">
              {failedNotifications?.length ? failedNotifications.map(n => (
                <div key={n.id} className="p-4 text-sm">
                  <div className="flex justify-between">
                    <p className="font-medium text-gray-900">{n.recipient}</p>
                    <span className="text-xs text-red-600 font-medium px-2 py-0.5 bg-red-50 rounded-full">{n.status}</span>
                  </div>
                  <p className="mt-1 text-gray-600 truncate">{n.last_error || 'Unknown error'}</p>
                  <p className="mt-2 text-xs text-gray-400">{format(new Date(n.created_at), 'PPpp')}</p>
                </div>
              )) : (
                <p className="p-8 text-center text-gray-500 italic">No failed notifications detected.</p>
              )}
            </div>
          </div>
        </section>

        {/* Governance Integrity */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Governance Integrity</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium">Orphan States & Inconsistencies</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {reconciliationItems?.length ? reconciliationItems.map(item => (
                <div key={item.id} className="p-4 text-sm">
                  <div className="flex justify-between">
                    <p className="font-medium text-red-700 capitalize">{item.issue_type.replace('_', ' ')}</p>
                    <span className="text-xs text-gray-500">L5 Action Required</span>
                  </div>
                  <p className="mt-1 text-gray-600">ID: {item.entity_id}</p>
                  <div className="mt-3 flex gap-2">
                    <button className="text-xs px-3 py-1 bg-gray-900 text-white rounded hover:bg-gray-800">Reconcile</button>
                    <button className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">View Context</button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500 italic">System integrity verified. No orphan states found.</p>
                  <button className="mt-4 text-sm text-blue-600 hover:underline">Run Integrity Scan</button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
