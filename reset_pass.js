const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function resetPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '81e20209-8a9b-4922-a319-989a4891e4eb', // Khush's ID found from DB query
    { password: '123456789' }
  );
  if (error) {
    console.error('Error updating password:', error);
  } else {
    console.log('Successfully updated password for', data.user.email);
  }
}

resetPassword();
