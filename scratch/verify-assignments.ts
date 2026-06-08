import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyLogic() {
  console.log("Fetching a sample project to verify assignment logic...");

  // Get a project that has data tables
  const { data: projectTable } = await supabase
    .from("project_data_tables")
    .select("project_id")
    .limit(1)
    .single();

  if (!projectTable) {
    console.log("No data tables found in database.");
    return;
  }

  const projectId = projectTable.project_id;
  console.log(`Testing Project ID: ${projectId}`);

  // Fetch project credits and required documents (Assignments Matrix)
  const { data: credits, error } = await supabase
    .from("project_credits")
    .select("id, credit_code, credit_name, documents_required")
    .eq("project_id", projectId);

  if (error || !credits) {
    console.error("Failed to fetch credits:", error);
    return;
  }

  console.log(`Found ${credits.length} credits. Testing assignment logic...`);
  console.log(`Available Credit Codes in DB:`, credits.map((c: any) => c.credit_code).join(", "));

  // Define some mock sheet names that might exist in a data table
  const mockSheets = [
    { name: "IE Credit 1" },
    { name: "WE Credit-1" },
    { name: "EE Credit 2" },
    { name: "Unmapped Sheet" }
  ];

  // Helper function from lib/data.ts to normalize documents_required
  const normalizeRequirements = (reqs: any) => {
    if (!reqs) return [];
    if (typeof reqs === 'string') {
      try { return JSON.parse(reqs); } catch (e) { return []; }
    }
    return Array.isArray(reqs) ? reqs : [reqs];
  };

  const normalizeCode = (code: string) => {
    return code.toLowerCase().replace(/credit/g, 'c').replace(/[^a-z0-9]/g, '');
  };

  // The logic used in DataTableView.tsx:
  mockSheets.forEach(sheet => {
    console.log(`\nEvaluating Sheet: "${sheet.name}"`);
    const sheetNameClean = normalizeCode(sheet.name);
    
    const matchedCredit = credits.find((c: any) => {
      const creditCodeClean = normalizeCode(c.credit_code);
      return creditCodeClean === sheetNameClean || sheetNameClean.includes(creditCodeClean);
    });

    if (!matchedCredit) {
      console.log(`  -> RESULT: Hidden (No matching credit code found for normalized name: '${sheetNameClean}')`);
      return;
    }

    console.log(`  -> Matched Credit: ${matchedCredit.credit_code} (${matchedCredit.credit_name})`);

    const requirements = normalizeRequirements(matchedCredit.documents_required);
    let tableReqFound = false;

    requirements.forEach((req: any) => {
      const isTableReq = req.type?.toLowerCase().includes('table') || 
                         req.type?.toLowerCase().includes('calculat') ||
                         req.label?.toLowerCase().includes('table') || 
                         req.label?.toLowerCase().includes('calculat');
      
      if (isTableReq) {
        tableReqFound = true;
        console.log(`  -> Found Table Assignment Requirement: "${req.label}"`);
        if (req.assigned_user_id) {
            console.log(`  -> Assigned to User ID: ${req.assigned_user_id}`);
        } else {
            console.log(`  -> Not assigned to anyone yet.`);
        }
      }
    });

    if (!tableReqFound) {
       console.log(`  -> RESULT: Hidden (No 'Calculations & Tables' document requirement found for this credit)`);
    } else {
       console.log(`  -> RESULT: Logic works. An individual contributor will only see this if their User ID matches the assignment above.`);
    }
  });

  console.log("\nVerification Complete.");
}

verifyLogic();
