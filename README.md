# WANNA-CRY THANXIEE

### WhatsApp Automation · Pairing Dashboard · Session Management

**A premium, mobile-friendly control experience for your WhatsApp bot.**

[![Open Dashboard](https://img.shields.io/badge/OPEN_DASHBOARD-Launch-7C3AED?style=for-the-badge)](https://wanna-crythanxie-v4145-loch.vercel.app) [![Fork](https://img.shields.io/badge/FORK-Repository-24292F?style=for-the-badge&logo=github)](https://github.com/Codezerox145/wanna-crythanxie-v4145/fork) [![Star](https://img.shields.io/badge/STAR-Repository-24292F?style=for-the-badge&logo=github)](https://github.com/Codezerox145/wanna-crythanxie-v4145/stargazers) [![WhatsApp Channel](https://img.shields.io/badge/FOLLOW-Official_Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z)

[Launch dashboard](https://wanna-crythanxie-v4145-loch.vercel.app) · [English guide](THANXIEEDEV/en/README.md) · [Source code](https://github.com/Codezerox145/wanna-crythanxie-v4145) · [Deploy anywhere](DEPLOYMENT-ANYWHERE.md)

---

## Cloud platforms

<table>
  <thead>
    <tr>
      <th>Platform</th>
      <th>Role in this project</th>
      <th>Deploy / project</th>
      <th>Persistence notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://cdn.simpleicons.org/render/46E3B7" width="22" height="22" alt="Render" /> <strong>Render</strong></td>
      <td>WhatsApp API and Baileys worker</td>
      <td><a href="https://dashboard.render.com/web/srv-dbr02sg8v5cc73ecc650">Open Render service</a> · <a href="https://render.com/deploy">Render deploy guide</a></td>
      <td>Current service is on the Free plan (ephemeral filesystem). Persistent disks require a paid service plan.</td>
    </tr>
    <tr>
      <td><img src="https://cdn.simpleicons.org/vercel/FFFFFF" width="22" height="22" alt="Vercel" /> <strong>Vercel</strong></td>
      <td>Next.js web dashboard</td>
      <td><a href="https://vercel.com/dashboard">Vercel dashboard</a> · <a href="https://vercel.com/new">Deploy to Vercel</a></td>
      <td>Dashboard hosting only; WhatsApp auth files remain on the API host.</td>
    </tr>
    <tr>
      <td><img src="https://cdn.simpleicons.org/koyeb/FFFFFF" width="22" height="22" alt="Koyeb" /> <strong>Koyeb</strong></td>
      <td>Alternative API host</td>
      <td><a href="https://app.koyeb.com/">Koyeb console</a> · <a href="https://www.koyeb.com/docs">Deployment docs</a></td>
      <td>Check current plan and persistent-storage availability before migrating sessions.</td>
    </tr>
    <tr>
      <td><img src="https://cdn.simpleicons.org/heroku/430098" width="22" height="22" alt="Heroku" /> <strong>Heroku</strong></td>
      <td>Alternative API host</td>
      <td><a href="https://dashboard.heroku.com/">Heroku dashboard</a> · <a href="https://devcenter.heroku.com/articles/deploying-nodejs">Node.js deploy guide</a></td>
      <td>Dyno filesystems are ephemeral; use an external persistent datastore for auth/session files.</td>
    </tr>
  </tbody>
</table>

> **Deployment truth:** Render + Vercel are the configured hosts for this project. Koyeb and Heroku are alternatives, not active deployments. Provider free tiers, limits, and prices change; verify them with the provider before deploying.

## Persistent WhatsApp session storage

The API stores account records, session metadata, encrypted message history, Baileys multi-file credentials, and per-session bot data beneath `PLATFORM_DATA_DIR`. The worker restores saved sessions on API startup when their credential file is present.

**Current hosting limitation:** the active Render service is on the Free plan. Its filesystem is ephemeral, so a restart or redeploy can erase WhatsApp credentials and local account data. Render only supports service-attached persistent disks on paid web services, private services, and background workers.

To enable durable storage on Render:

1. Upgrade the API service to a paid plan in the Render Dashboard.
2. Open the service's **Disks** page and attach a disk mounted at `/var/data`. Choose capacity based on actual session and message-data growth.
3. Set `PLATFORM_DATA_DIR=/var/data/platform_data` in the Render environment.
4. Keep the service at one instance; Render disks are single-instance storage and prevent zero-downtime deploys.
5. Deploy, then verify that `/var/data/platform_data/sessions` is writable and that a test file survives a service restart.

Do not assume persistence is active until the disk is attached and a restart-survival test passes. Back up important data separately; a disk is not a substitute for an application-level backup.

## Real pairing verification checklist

1. Create/sign in to your dashboard account.
2. Open **Pair a device**, enter a WhatsApp number in international format, and request a pairing code.
3. Complete the WhatsApp **Linked devices → Link a device → Link with phone number instead** flow.
4. Enter the displayed code in WhatsApp and wait for the API session to report **online**.
5. Send a test message to the connected bot and confirm it receives and responds.
6. Restart the Render service and confirm the session reconnects without requesting a new pairing code. This final check is meaningful only after persistent storage is attached.

Never publish pairing codes, `creds.json`, auth folders, JWT secrets, or screenshots containing account credentials.

## Project structure

- Dashboard: dashboard-clean/
- API and authentication: server/index.js
- Baileys session worker: bot/worker.js
- Shared command modules: commands/
- Shared bot libraries: lib/
- Bot avatar: bot-avatar.jpg
- Runtime customer data: platform_data/ (never commit)

## Pairing walkthrough

1. Open the dashboard and create your own account.
2. Open Pair a device and enter your full international WhatsApp number.
3. Complete the community-support confirmation.
4. In WhatsApp, open Linked devices → Link a device → Link with phone number instead.
5. Enter the pairing code displayed by the dashboard and wait for the connected state.

The repository contains a pairing-demo.gif asset. It has not yet been verified against the latest API/worker implementation, so treat it as an existing preview asset rather than proof of a successful live pairing. Record a fresh capture after a real test-number pairing.

## Deploy separately

### Render API
- Root directory: repository root
- Build command: npm install
- Start command: npm run api
- Health check: /health
- Set DASHBOARD_ORIGIN to the exact Vercel dashboard origin.
- Keep JWT_SECRET private. The Render Blueprint can generate it.
- Use persistent storage for production sessions. Render Free storage is ephemeral.

### Vercel dashboard
- Root Directory: dashboard-clean
- Install: npm install
- Build: npm run build
- Set NEXT_PUBLIC_API_BASE to the Render API HTTPS origin.
- Set the other public dashboard values from dashboard-clean/.env.example.

## Environment configuration

All secret values in .env.example are blank by design. Copy the file to .env locally or fill the Render environment settings manually. Never commit .env, API keys, JWT secrets, passwords, or WhatsApp auth folders.

## Security notes

- Each account sees only its own sessions.
- Each WhatsApp session has a separate worker and auth directory.
- Pairing codes and WhatsApp credentials must remain private.
- Baileys is an unofficial WhatsApp Web client; disconnections and account restrictions remain possible.
- Render Free is suitable only for disposable testing, not reliable long-lived WhatsApp sessions.

## Implementation status

The current baseline includes account signup/login, session lifecycle endpoints, Baileys pairing, shared command-router integration, avatar menu replies, randomized welcome/goodbye fallbacks, and health/runtime/analytics endpoints. Dashboard VIP/staff administration, Chat Center, end-to-end encrypted messaging, payment processing, and full production audit workflows still need implementation and verification. Do not treat them as shipped features yet.

**Developer:** THANXIEE DEV
