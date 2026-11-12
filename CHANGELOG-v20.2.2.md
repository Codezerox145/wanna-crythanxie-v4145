# WANNA-CRY THANXIEE v20.2.2

- Restored the dashboard-clean Next.js project structure from the flattened source files.
- Added a separate Express API for signup/login, JWT authentication, isolated WhatsApp session management, runtime metrics and health checks.
- Added one Baileys worker process and auth/data directory per dashboard session.
- Reconnected the existing command modules through lib/ and commands/ and passed the mocked command suite (438 registered commands; 459 checks).
- Added branded menu image cards using the bundled bot avatar, welcome/goodbye defaults, scheduled-message ticking, defensive threat scanning and group filters.
- Updated Render start/build configuration and added separate API/dashboard environment templates with blank secret placeholders.
- Added CI for API syntax, mocked command tests and Next.js production build.

Live WhatsApp pairing and hosting deployment still require manual environment configuration and a real test number.
