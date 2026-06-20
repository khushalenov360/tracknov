const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'nandita.bapat@sapphirefoods.in';
  const newPassword = 'Enov360';
  
  console.log(`Looking up user: ${email}`);
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  
  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.error("User not found!");
    return;
  }
  
  console.log(`Found user: ${user.id}. Resetting password...`);
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );
  
  if (error) {
    console.error("Error updating password:", error);
  } else {
    console.log("Successfully updated password!");
  }
}

main();
