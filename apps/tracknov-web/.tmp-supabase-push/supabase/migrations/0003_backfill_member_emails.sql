update public.project_members pm
set member_email = au.email
from auth.users au
where pm.user_id = au.id
  and pm.member_email is null;
