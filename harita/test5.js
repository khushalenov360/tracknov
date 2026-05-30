const { createClient } = require('@supabase/supabase-js');
const url = 'https://uiecvxxamykfubgtqzap.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZWN2eHhhbXlrZnViZ3RxemFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE5ODU5OSwiZXhwIjoyMDkyNzc0NTk5fQ.t4X2HvSDlvvOBlwMGcPEAcZz8yfup4EbYkLOlBjB1fg';
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: "SELECT trigger_name, event_manipulation FROM information_schema.triggers WHERE event_object_table = 'assignments';"
  });
  if (error) console.error("Error:", error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
