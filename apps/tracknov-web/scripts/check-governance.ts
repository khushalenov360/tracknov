import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envPath = path.resolve(process.cwd(), ".env.local");
console.log(`[DEBUG] Loading env from: ${envPath}`);
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error(`[DEBUG] Dotenv error:`, result.error);
  } else {
    console.log(`[DEBUG] Dotenv loaded successfully.`);
  }
} else {
  console.error(`[DEBUG] .env.local NOT FOUND at ${envPath}`);
}

console.log(`[DEBUG] SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "EXISTS" : "MISSING"}`);

// Now we can import the app code
import { enforceDeploymentGate } from "../lib/governance/compatibilityValidator";

// Execute the gate
enforceDeploymentGate().catch(err => {
  console.error("[FATAL] Governance gate execution failed:", err);
  process.exit(1);
});
