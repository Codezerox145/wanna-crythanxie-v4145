# Deploy WANNA-CRY THANXIEE on other platforms

The project is split into two independently deployable Node.js services. It is not locked to Render or Vercel.

## Runtime requirements

- Node.js 20, 22 (recommended), or another version supported by the installed dependencies.
- Root API service starts with `npm install && npm run api`.
- Dashboard service runs from `dashboard-clean/` with `npm install && npm run build && npm start`.
- The API listens on `process.env.PORT` and exposes `GET /health`.
- The dashboard must be built with `NEXT_PUBLIC_API_BASE` pointing to the public HTTPS API origin.

## API service environment

Set these on the API host:

- `NODE_ENV=production`
- `JWT_SECRET`: random secret with at least 32 characters; keep private.
- `OWNER_EMAILS=mrzeroexploit@gmail.com` (or your own owner email list).
- `DASHBOARD_ORIGIN`: exact public dashboard origin, no trailing slash.
- `PLATFORM_DATA_DIR`: absolute path on a persistent volume.
- `MAX_SESSIONS_PER_USER=3`
- `BOT_NAME=WANNA-CRY THANXIEE`
- `BOT_PREFIX=.`
- `SERVER_REGISTRY_JSON=[]` until additional real hosts have health checks.
- `GITHUB_TOKEN` is optional; do not commit it.
- `GEMINI_API_KEY` is optional and only needed for Gemini-backed AI tools.

Mount a persistent volume at the path used by `PLATFORM_DATA_DIR`. The volume must retain user records, WhatsApp auth state and session data between deploys. Do not use an ephemeral filesystem for production WhatsApp sessions.

## Dashboard service environment

Set these at build time:

- `NEXT_PUBLIC_API_BASE=https://your-api-host.example`
- `NEXT_PUBLIC_BOT_NAME=WANNA-CRY THANXIEE`
- `NEXT_PUBLIC_BOT_AVATAR_URL=https://your-public-image-url`
- `NEXT_PUBLIC_CHANNEL_LINK=https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z`
- `NEXT_PUBLIC_GITHUB_REPO=https://github.com/Codezerox145/wanna-crythanxie-v4145`

Build and start from the dashboard directory. The dashboard is a Next.js app and should be deployed as a Node.js web service unless the target platform has a compatible Next.js runtime.

## Deployment sequence

1. Provision the API service and attach persistent storage.
2. Configure the API environment variables and start command.
3. Confirm `/health` returns JSON with `ok: true`.
4. Deploy the dashboard with `NEXT_PUBLIC_API_BASE` set to the API HTTPS origin.
5. Set `DASHBOARD_ORIGIN` on the API to the exact dashboard domain.
6. Create an account, sign in, pair a test WhatsApp number and verify a real inbound/outbound message.
7. Keep API and dashboard deployments on the same Git commit when releasing changes.

## Platform notes

This layout can be deployed on Render, Railway, Fly.io, a VPS, Docker-based hosting, or other Node.js-capable providers. Each provider needs its own persistent-volume and environment-variable configuration. The repository's `render.yaml` is a Render Blueprint, not a universal deployment manifest.

## Operational boundaries

- WhatsApp connectivity is provided by the Baileys Web client. It is unofficial and may disconnect or require re-pairing.
- Native WhatsApp group polls are supported for groups accessible to the connected account.
- WhatsApp Channel publishing is not exposed by the current Baileys integration; the dashboard only links to the official channel.
- Payment processing is not included.
- Never commit `.env`, JWT secrets, API keys, or WhatsApp auth folders.
