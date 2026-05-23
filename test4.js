const { createClient } = require('@supabase/supabase-js');
const url = 'https://uiecvxxamykfubgtqzap.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZWN2eHhhbXlrZnViZ3RxemFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE5ODU5OSwiZXhwIjoyMDkyNzc0NTk5fQ.t4X2HvSDlvvOBlwMGcPEAcZz8yfup4EbYkLOlBjB1fg';
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('assignments').select('id').limit(1);
  if (error) console.error("Query assignments error:", error);
  else console.log("Can query assignments:", data);
}
run();
