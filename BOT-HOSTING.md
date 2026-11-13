# Bot-Hosting.net deployment

This repository contains two separate applications:

- The Node.js API and Baileys workers live at the repository root, with the server entry point at `server/index.js`.
- The Next.js dashboard lives in `dashboard-clean/` and should remain deployed on Vercel.

## Bot-Hosting startup

Create/import the full repository at the deployment volume root. Do not place the repository inside an extra nested folder, and do not upload `node_modules`.

Recommended startup settings:

- Runtime: Node.js
- Runtime version: 22
- Entry file: `server/index.js` (when the panel allows selecting it)
- Start command: `npm install --omit=dev && exec node server/index.js`

The start command explicitly selects the API entry point, so the dashboard's Next.js page files are not executed by Node. It also installs production dependencies on each boot as required by the host's startup-command workflow.

The API listens on `SERVER_PORT` first, then `PORT`, and binds to `0.0.0.0`.

## Environment variables

Set these in the deployment's Environment tab. Never commit real secrets.

Required:
- `NODE_ENV=production`
- `HOSTING_PROVIDER=Bot-Hosting.net`
- `JWT_SECRET=<random secret of at least 32 characters>`
- `OWNER_EMAILS=mrzeroexploit@gmail.com`
- `DASHBOARD_ORIGIN=https://wanna-crythanxie-v4145-loch.vercel.app`
- `PLATFORM_DATA_DIR=./platform_data`

Recommended:
- `BOT_NAME=WANNA-CRY THANXIEE`
- `BOT_PREFIX=.`
- `OWNER_NUMBERS=263780706629`
- `MAX_SESSIONS_PER_USER=1` (increase only after checking available RAM)
- `BAILEYS_LOG_LEVEL=silent`
- `SERVER_REGISTRY_JSON=[]`

Optional display metadata: set `HOSTING_CPU_LIMIT_PERCENT`, `HOSTING_MEMORY_LIMIT_MB`, and `HOSTING_STORAGE_LIMIT_MB` only to the limits currently shown in the Bot-Hosting panel. Set `HOSTING_REGION` or `HOSTING_COUNTRY` only when the provider explicitly shows those values. The API deliberately reports unknown values as not exposed rather than inventing server specifications.

Do not create or override `SERVER_PORT`; it is assigned by Bot-Hosting.

## Persistent data and WhatsApp sessions

The API stores accounts, session metadata, encrypted message history, and Baileys authentication files beneath `PLATFORM_DATA_DIR`. Keep that directory on the deployment's persistent volume. Do not delete it during updates, and take a backup before replacing files. A redeploy must preserve `platform_data/` so paired WhatsApp devices do not need to be linked again.

## Resource warning

The current deployment panel previously showed 256 MB RAM, 15% CPU, and 512 MB storage. That is tight for npm installation plus Express, Baileys, and media dependencies. Increase memory to at least 512 MB before the first install/start if the plan permits; 1 GB or more is safer for a live WhatsApp worker. If installation exits with code 137, the container ran out of memory.

## Verification

After startup, open `/health` on the public deployment URL. A healthy response has `ok: true` and identifies the API service. Then update the Vercel environment variable `NEXT_PUBLIC_API_BASE` to the Bot-Hosting public API URL and redeploy the dashboard.

Do not add placeholder server records to `SERVER_REGISTRY_JSON`. The API's current server card uses live process information and only displays provider limits/region when those values have been explicitly configured.
