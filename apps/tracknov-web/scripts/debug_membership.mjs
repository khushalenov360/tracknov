
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debug() {
  console.log('--- Checking project_users ---')
  const { data: projectUsers, error: puError } = await supabase
    .from('project_users')
    .select('*')
  
  if (puError) {
    console.error('Error fetching project_users:', puError)
  } else {
    console.table(projectUsers)
  }

  console.log('--- Checking projects ---')
  const { data: projects, error: prError } = await supabase
    .from('projects')
    .select('id, name, project_code')
  
  if (prError) {
    console.error('Error fetching projects:', prError)
  } else {
    console.table(projects)
  }
}

debug()
