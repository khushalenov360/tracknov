const { createClient } = require('@supabase/supabase-js');
const url = 'https://uiecvxxamykfubgtqzap.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZWN2eHhhbXlrZnViZ3RxemFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE5ODU5OSwiZXhwIjoyMDkyNzc0NTk5fQ.t4X2HvSDlvvOBlwMGcPEAcZz8yfup4EbYkLOlBjB1fg';
const supabase = createClient(url, key);

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error(error); return; }
  const khush = users.users.find(u => u.email === 'khush@enov360.com');
  console.log("Khush user_metadata:", khush.user_metadata);

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', khush.id).single();
  console.log("Khush profile:", profile);
}
run();
