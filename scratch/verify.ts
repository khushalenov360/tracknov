import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: resolve(process.cwd(), "apps/tracknov-web/.env.local") });

// Mock next/headers so createReaderClient doesn't crash
jest = require("jest-mock");
jest.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
  }),
}));

async function runValidation() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const projectIds = ["1fabd316-6d0f-4de3-a149-7e23c528aab9"];

  console.log("Validating project_credits query...");
  const [{ data: creditsData, error: creditsError }] = await Promise.all([
    client
      .from("project_credits")
      .select("id, project_id, credit_code, credit_name, documents_required, what_to_submit, state:status, points:max_points")
      .in("project_id", projectIds)
      .order("credit_code"),
  ]);

  if (creditsError) {
    console.error("Query Failed:", creditsError);
    process.exit(1);
  }

  const credits = creditsData || [];
  console.log(`Successfully fetched ${credits.length} credits.`);
  
  if (credits.length > 0) {
    console.log("Sample Credit Format:");
    console.log(JSON.stringify(credits[0], null, 2));
    
    // Simulate the snapshot logic
    const completeCredits = credits.filter((credit: any) => credit.state === "APPROVED" || credit.state === "complete").length;
    const blockedCredits = credits.filter((credit: any) => credit.state === "BLOCKED").length;
    
    console.log("\nSnapshot String Generation:");
    console.log(`Credits: total=${credits.length}, complete=${completeCredits}, blocked=${blockedCredits}.`);
  } else {
    console.log("NO CREDITS FOUND.");
  }
}

runValidation().catch(console.error);
