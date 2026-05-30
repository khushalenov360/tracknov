import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const emailToDelete = "mep@enov360.com";
  
  // Find the user by email in auth.users
  const { data: users, error: fetchError } = await admin.auth.admin.listUsers();
  if (fetchError) {
    console.error("Failed to fetch users:", fetchError);
    return;
  }
  
  const targetUser = users.users.find(u => u.email === emailToDelete);
  
  if (!targetUser) {
    console.log(`User with email ${emailToDelete} not found in auth.users.`);
    
    // Also try checking profiles just in case
    const { data: profiles } = await admin.from("profiles").select("*").eq("email", emailToDelete);
    if (profiles && profiles.length > 0) {
      console.log("Found in profiles but not in auth, deleting from profiles...");
      await admin.from("profiles").delete().eq("email", emailToDelete);
      console.log("Deleted from profiles.");
    }
    return;
  }

  console.log(`Found user ${emailToDelete} with ID ${targetUser.id}. Deleting...`);
  
  // Delete from auth.users (this should cascade to profiles if set up that way, but we can do both)
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(targetUser.id);
  
  if (deleteAuthError) {
    console.error("Error deleting from auth:", deleteAuthError);
  } else {
    console.log("Successfully deleted from auth.users.");
  }
  
  // Force delete from profiles just to be sure
  const { error: deleteProfError } = await admin.from("profiles").delete().eq("user_id", targetUser.id);
  if (deleteProfError) {
    console.error("Error deleting from profiles:", deleteProfError);
  } else {
    console.log("Successfully deleted from profiles.");
  }
}

main().catch(console.error);
