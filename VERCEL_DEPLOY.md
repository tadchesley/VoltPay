# Voltpay — Deploying to Vercel (experimentalServices)

Vercel's new `experimentalServices` feature lets you deploy the React frontend and the
FastAPI backend as a single project. The `vercel.json` in the repo root already declares both.

## Repo layout Vercel expects

```
/
├── vercel.json              ← multi-service config
├── frontend/                ← React (create-react-app + craco)
│   ├── package.json
│   └── ...
└── backend/                 ← FastAPI
    ├── server.py
    ├── requirements.txt
    └── ...
```

## What's in vercel.json

```json
{
  "experimentalServices": {
    "frontend": {
      "root": "frontend",
      "routePrefix": "/",
      "framework": "create-react-app"
    },
    "backend": {
      "root": "backend",
      "routePrefix": "/api"
    }
  }
}
```

- Frontend serves at `/`
- Backend service receives every request starting with `/api`
- `server.py` already has a defensive middleware that re-adds `/api/` if Vercel strips it,
  so routes work either way

## Prerequisites

1. **MongoDB Atlas** — Vercel doesn't host databases. Create a free cluster and get the
   `mongodb+srv://` connection string.
2. **Vercel** account connected to your GitHub repo.

## Required environment variables (Vercel → Project Settings → Environment Variables)

Apply each to **Production, Preview, and Development**:

| Name | Example | Notes |
|------|---------|-------|
| `MONGO_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` | from MongoDB Atlas |
| `DB_NAME` | `voltpay` | any name |
| `JWT_SECRET` | run `openssl rand -hex 32` and paste | required |
| `FRONTEND_URL` | `https://your-project.vercel.app` | your deployed URL |
| `PLATFORM_FEE_PERCENT` | `0` | optional |
| `PLATFORM_FEE_FIXED_CENTS` | `0` | optional |
| `REACT_APP_BACKEND_URL` | *(leave empty)* | same-origin deploy |

## Deploy

1. `git add vercel.json backend/server.py && git commit -m "vercel: experimentalServices" && git push`
2. In Vercel, **Add New Project → Import** the repo.
3. **Root Directory** = `.` (repo root).
4. Add the env vars above.
5. **Deploy**.

Vercel will:
- Build frontend with `yarn build` inside `/frontend`
- Install Python deps from `/backend/requirements.txt`
- Run FastAPI under `/api/*`
- Serve the React SPA at every other route

## After deploy — quick verification

```bash
# Should return {"name":"Voltpay","version":"1.0.0","status":"ok"}
curl https://<your-project>.vercel.app/api/

# Should return your landing page HTML
curl -I https://<your-project>.vercel.app/
```

Visit `/register` to create a merchant account end-to-end.

## Notes

- `experimentalServices` is a Vercel beta feature. If routing acts up, check Vercel's
  build logs first.
- The `/api/index.py` file in this repo is **not used** by the experimentalServices
  config — it was a fallback from the previous approach. You can leave it or delete it.
- Cold starts apply only to the backend service (~1–3 s after idle). Frontend is static.
