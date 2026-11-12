# Wiring your existing pairing dashboard

You mentioned you already have a dashboard that handles web pairing. There
are two ways to connect it to this bot — pick whichever matches what your
dashboard actually does.

## Option A — your dashboard issues a pairing/QR code itself

If your dashboard is the thing showing the user a QR code or pairing code
and completing the WhatsApp handshake, then **your dashboard IS a Baileys
(or similar) client** and it will end up with its own `auth_session`
folder (creds.json + sender-key files). In that case:

1. Point this bot at the SAME auth folder your dashboard writes to, by
   setting the auth directory in `index.js` (`AUTH_DIR`) to that path, or
   copying the folder contents into this project's `auth_session/`.
2. Only run ONE process against that session at a time — Baileys sessions
   are single-connection. If your dashboard stays running, this bot can't
   also connect with the same session; you'd run this bot's command logic
   as part of your dashboard's existing socket instance instead of as a
   separate process. If that's your setup, the integration point is
   `lib/commandHandler.js`'s `handleCommand(ctx)` — call it from your
   dashboard's own `messages.upsert` handler with a `ctx` built the same
   way `index.js`'s `buildContext()` does.

## Option B — your dashboard is a pure "pairing session generator"

If your dashboard's job is just to produce a reusable auth session (user
scans/pairs once on your site, dashboard stores the resulting session
files, and hands them off), then set in `.env`:

```
PAIRING_ENDPOINT=https://your-dashboard.example.com/api/session/export
PAIRING_ENDPOINT_TOKEN=whatever-bearer-token-it-needs
```

Your endpoint should return JSON shaped like:

```json
{
  "creds.json": { "...": "..." },
  "app-state-sync-key-ABC123.json": { "...": "..." },
  "pre-key-1.json": { "...": "..." }
}
```

i.e. exactly the file contents `useMultiFileAuthState` would have written
to disk itself, keyed by filename. `index.js`'s
`syncFromDashboardIfConfigured()` writes each entry to
`auth_session/<filename>` before Baileys starts, so the bot boots already
authenticated instead of asking for a fresh QR/pairing code.

If your dashboard's actual export format is different (e.g. a single
base64 blob, or a different key scheme), tell me the exact shape it
returns and I'll adjust `syncFromDashboardIfConfigured()` to match it
precisely rather than guessing further.

## Option C — manual, one-time

Simplest path if you don't want to build an integration right now: pair
this bot once via its own QR/pairing-code flow (just run `npm start`), then
back up the resulting `auth_session/` folder somewhere safe. As long as you
don't log the device out from the phone, that session stays valid.
