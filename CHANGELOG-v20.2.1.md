# WANNA-CRY THANXIEE v20.2.1

## Menu and branding update
- Rebuilt the main menu with a clean numbered category directory and quick navigation.
- Added a dedicated Media & Sticker Tools category (`.mediamenu`, `.stickermenu`).
- Category menus now show only registered public commands, with command counts and usage guidance.
- Full directory (`.allmenu`) groups public commands into separate branded image-card sections.
- Preserved VIP and Shadow Enforcement privacy: privileged commands are not exposed in public menus.
- Bundled the supplied crying-anime artwork as `assets/bot-avatar.jpg`.
- Changed the default avatar loader to use the bundled local image, so menu/response cards do not depend on a remote image host.
- Fixed menu section line splitting and updated project version metadata.

## Verification
- JavaScript syntax checks passed for project JS files.
- Menu smoke tests passed for main menu, AI menu, media menu and public-command filtering.
- Full `npm test` could not run in this environment because dependency installation timed out and `dotenv` was unavailable. Run `npm ci` then `npm test` after deployment or on a machine with working package access.


## Dashboard infrastructure and analytics update

- Added authenticated `/analytics` endpoint with account-scoped session/command totals and a seven-day command activity series. Platform-wide registered-user totals are restricted to emails configured in `OWNER_EMAILS`.
- Added worker-to-API command telemetry over the existing child-process IPC channel, with a bounded 20,000-event JSON history.
- Added authenticated `/servers` endpoint and a responsive Server Registry dashboard page. The current API host is shown as live; optional `SERVER_REGISTRY_JSON` records are labelled unverified and capped at 243 additional records (244 total).
- Added analytics summary cards and a seven-day activity chart to Overview, with automatic 30-second refresh.
- Added Servers navigation and corrected dashboard repository/avatar references to `mrzeroexploitzw/wana-crythanxiev4145`.
- Advertising, payment processing, and VIP revenue analytics are deliberately labelled not configured; no fabricated revenue, server capacity, or user counts are displayed.
- Verification: JavaScript syntax checks passed for the changed backend files. The full `npm test` suite could not run in this workspace because project dependencies (including `dotenv`) are not installed. Live WhatsApp pairing and deployment remain unverified.
