const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:Enov360@kkk%23@db.uiecvxxamykfubgtqzap.supabase.co:5432/postgres"
  });

  await client.connect();

  const file1 = fs.readFileSync("../supabase/migrations/0111_seed_missing_roles.sql", 'utf8');
  const file2 = fs.readFileSync("../supabase/migrations/0112_seed_review_criteria.sql", 'utf8');

  console.log("Executing 0111_seed_missing_roles.sql...");
  await client.query(file1);
  console.log("Done.");

  console.log("Executing 0112_seed_review_criteria.sql...");
  await client.query(file2);
  console.log("Done.");

  await client.end();
}

run().catch(console.error);
