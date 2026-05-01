# Deploy Tracknov on Hetzner with Coolify

This app is a Dockerized Next.js 14 service. Supabase remains the database,
auth, storage, and realtime backend.

## 1. Hetzner server

Recommended starting size:

- CPX21 or CX22
- Ubuntu 24.04 LTS
- 40 GB+ disk
- SSH key authentication

Open firewall ports:

- `22` for SSH, restricted to your IP if possible
- `80` and `443` for Coolify-managed HTTP/HTTPS
- `8000` only while initially opening the Coolify dashboard, then restrict it

## 2. Install Coolify

SSH into the server as `root`, then run the official Coolify installer:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

If you are not logged in as `root`, use:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

After installation, open:

```text
http://YOUR_SERVER_IP:8000
```

Create the Coolify admin account, add your domain, and enable HTTPS.

## 3. Supabase

Create or use a Supabase project, then apply the SQL migrations in
`supabase/migrations` before production traffic.

Required Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional AI values:

- `GEMINI_API_KEY`
- `AI_PROVIDER=gemini`
- `AI_MODEL=gemini-2.5-flash`

## 4. Coolify application

Create a new application in Coolify:

- Source: GitHub repository
- Repository: `khushalenov360/tracknov` or your fork
- Branch: `main`
- Build Pack: Dockerfile
- Dockerfile location: `/Dockerfile`
- Port: `3000`

Add the production environment variables from the Supabase section.

Do not add local-only values in production:

- `PLAYWRIGHT_BASE_URL`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_REF`

Deploy the application.

## 5. Domain and auth callback

Point your domain DNS to the Hetzner server:

- `A` record: `@` -> `YOUR_SERVER_IP`
- Optional `CNAME`: `www` -> root domain

In Coolify, attach the domain to the app and request HTTPS.

In Supabase Authentication URL settings, set:

- Site URL: `https://your-domain.com`
- Redirect URLs:
  - `https://your-domain.com/**`
  - `http://localhost:3010/**` for local development if needed

## 6. Production smoke test

After deployment:

1. Open `/login`.
2. Sign in with a real Supabase user.
3. Create or open a project.
4. Upload a document.
5. Export tracker, summary, and submission pack.

If the login page appears but sign-in fails, check Supabase Auth URL settings
and the three Supabase environment variables in Coolify.
