# Deployment — WANNA-CRY THANXIEE v20.2.2

## Render API
- Root directory: repository root
- Build command: `npm install`
- Start command: `npm run api`
- Health check: `/health`
- Set `DASHBOARD_ORIGIN` to the exact Vercel production origin.
- Keep `JWT_SECRET` private; Render Blueprint can generate it.
- For production, attach a persistent disk and set `PLATFORM_DATA_DIR` to its mount path. Render Free has ephemeral storage and is only suitable for disposable smoke tests.

## Vercel dashboard
- Root Directory: `dashboard-clean`
- Install command: `npm install`
- Build command: `npm run build`
- Set `NEXT_PUBLIC_API_BASE` to the Render API HTTPS origin.
- Set `NEXT_PUBLIC_GITHUB_REPO` to this repository and redeploy after changing build-time variables.

The API runs long-lived Baileys child workers and must not be deployed as a serverless function. Never put secrets in `NEXT_PUBLIC_*` variables.
