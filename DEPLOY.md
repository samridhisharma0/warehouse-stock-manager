# Deployment Guide

## Architecture

```
Vercel (frontend)  ──→  Railway (Express API)  ──→  Supabase (Postgres)
  localhost:5173          your-app.up.railway.app     your-project.supabase.co
```

## Step 1 — Supabase (database)

1. Go to https://supabase.com → New project
2. Open **SQL Editor** → paste the contents of `server/supabase-migration.sql` → Run
3. Go to **Settings → API** → copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **Service Role Key** (long secret key — NOT the anon key)

## Step 2 — Railway (backend)

1. Go to https://railway.com → New project → Deploy from GitHub repo
2. Select this repo, set **Root Directory** to `server`
3. Railway auto-detects Node.js. Set these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` (from Step 1) |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (Service Role Key from Step 1) |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` |
| `JWT_SECRET` | any random string, e.g. `openssl rand -hex 32` |
| `PORT` | `4000` (or leave blank — Railway assigns one) |

4. Railway will build and give you a URL like `https://your-app.up.railway.app`
5. Test: `curl https://your-app.up.railway.app/api/health`

## Step 3 — Vercel (frontend)

1. Go to https://vercel.com → Import this GitHub repo
2. Set **Root Directory** to `client`
3. Set **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-app.up.railway.app` |

4. Deploy. The `vercel.json` rewrite rule handles SPA routing (`/shipping`, `/products`, etc.)

## Done

- Open `https://your-app.vercel.app`
- Login with `demo@example.com` / `password123`
- All API calls go to Railway → Supabase

## Local Development

No Supabase needed. Just:

```bash
npm install
npm run dev
```

When `SUPABASE_URL` is blank, the server falls back to the local JSON file store automatically.
