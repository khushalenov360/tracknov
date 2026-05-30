import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { createAdminClient } from "../lib/supabase/admin";

async function checkMismatch() {
  const admin = createAdminClient();
  const snapshotId = "e941620a-fe89-4620-a4ee-00ef6298f32d";

  console.log(`Checking snapshot: ${snapshotId}`);

  const { data: snapshot } = await admin
    .from("certification_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single();

  console.log("Snapshot Hash:", snapshot?.certification_snapshot_hash);

  const { data: certificates } = await admin
    .from("replay_certificates")
    .select("*")
    .eq("snapshot_id", snapshotId)
    .order("created_at", { ascending: false });

  console.log(`Found ${certificates?.length ?? 0} certificates.`);
  certificates?.forEach(c => {
    console.log(`- ${c.created_at}: Hash=${c.replay_hash}, Match=${c.deterministic_match}`);
  });
}

checkMismatch();
