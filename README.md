# WANNA-CRY THANXIEE

### WhatsApp Automation · Pairing Dashboard · Session Management

**A premium, mobile-friendly control experience for your WhatsApp bot.**

[![Open Dashboard](https://img.shields.io/badge/OPEN_DASHBOARD-Launch-7C3AED?style=for-the-badge)](https://wanna-crythanxie-v4145-loch.vercel.app) [![Fork](https://img.shields.io/badge/FORK-Repository-24292F?style=for-the-badge&logo=github)](https://github.com/Codezerox145/wanna-crythanxie-v4145/fork) [![Star](https://img.shields.io/badge/STAR-Repository-24292F?style=for-the-badge&logo=github)](https://github.com/Codezerox145/wanna-crythanxie-v4145/stargazers) [![WhatsApp Channel](https://img.shields.io/badge/FOLLOW-Official_Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029VbE9KJvJkK73C7RNvP2z)

[Launch dashboard](https://wanna-crythanxie-v4145-loch.vercel.app) · [English guide](THANXIEEDEV/en/README.md) · [Source code](https://github.com/Codezerox145/wanna-crythanxie-v4145)

---

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
