import { env } from "@/lib/env";
import { getTeamMembers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TestEnvPage() {
  let members: any[] = [];
  try {
    members = await getTeamMembers();
  } catch (e: any) {
    console.error(e);
  }

  return (
    <div>
      <h1>Test Env</h1>
      <p>Service Role Key exists: {env.supabaseServiceRoleKey ? "YES" : "NO"}</p>
      <p>Service Role Key length: {env.supabaseServiceRoleKey?.length}</p>
      <p>Members Length: {members.length}</p>
      <pre>{JSON.stringify(members, null, 2)}</pre>
    </div>
  );
}
