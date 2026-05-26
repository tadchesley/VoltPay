# Voltpay — Deploying to Vercel

Voltpay is a full-stack app (React + FastAPI + MongoDB). Vercel can host all three pieces
as a single project using its serverless Python runtime.

## 1. Prerequisites

1. **MongoDB Atlas** account (free tier is fine) — Vercel does not host databases.
   Create a cluster and grab the connection string (`mongodb+srv://...`).
2. **Vercel** account connected to your GitHub repo.

## 2. Files already configured

```
/vercel.json          ← tells Vercel how to build & route
/api/index.py         ← serverless entrypoint that exposes the FastAPI app
/api/requirements.txt ← Python deps for the serverless function
/.vercelignore        ← excludes tests, .env, etc.
```

You do **not** need a separate backend host. The same Vercel project serves:
- React frontend at `/`
- FastAPI backend at `/api/*`

## 3. Required Vercel environment variables

In your Vercel project: **Settings → Environment Variables** add:

| Name | Example | Required |
|------|---------|----------|
| `MONGO_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` | ✅ |
| `DB_NAME` | `voltpay` | ✅ |
| `JWT_SECRET` | (run `openssl rand -hex 32` and paste the result) | ✅ |
| `FRONTEND_URL` | `https://your-project.vercel.app` (your deployed URL) | ✅ |
| `PLATFORM_FEE_PERCENT` | `0` | optional |
| `PLATFORM_FEE_FIXED_CENTS` | `0` | optional |
| `REACT_APP_BACKEND_URL` | leave **empty** (frontend & backend share the same domain) | ✅ (set as empty string) |

> Apply all variables to **Production, Preview, and Development** scopes.

## 4. Deploy

1. Push your repo to GitHub.
2. In Vercel, **Add New Project** → import your repo.
3. **Framework Preset:** Vercel should detect `Other` (because of `vercel.json`). Leave it.
4. **Root Directory:** leave as `.` (root of repo).
5. Add the env vars from step 3.
6. Click **Deploy**.

The build will:
- Run `yarn install && yarn build` inside `frontend/`
- Install Python deps from `api/requirements.txt`
- Expose `/api/*` to the FastAPI app
- Serve the React build at every other URL

## 5. After deploy

- Visit `https://<your-project>.vercel.app` → landing page
- `/register` to create a merchant account
- `/api/v1/payment_intents` for the REST API

## Known Vercel limitations

- **Cold starts (~1–3 s)** on first request after idle. Subsequent requests are fast.
- **10 s timeout** on the Hobby plan, 60 s on Pro. Confirm-payment is well under both.
- **No persistent file system / background workers.** Webhook delivery is logged but
  not yet retried by a worker (this is the same as on Emergent — see PRD backlog).
- Each cold start opens a new MongoDB connection. Use MongoDB Atlas (which pools
  connections) — do not use a single-node EC2 mongod.

## Optional: deploy only the frontend on Vercel

If you'd rather keep the backend somewhere else (Railway, Render, Fly.io), delete
`vercel.json` + `/api`, then set:

- Vercel **Root Directory** = `frontend`
- Vercel **Framework Preset** = Create React App
- Env var `REACT_APP_BACKEND_URL` = your backend's public URL

That's it — Vercel will auto-detect everything else.
