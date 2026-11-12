# WANNA-CRY THANXIEE — v20.2.1 (430-command upgrade)

Baileys-based WhatsApp bot upgraded from the supplied source tree. The command router now registers **exactly 430 unique command handlers** and the menu is arranged into **27 sections** plus `.allmenu`. Existing command modules are retained; the expansion loader explicitly removes duplicate names so it does not overwrite original handlers.

## Setup

```bash
npm install
cp .env.example .env
# Set OWNER_NUMBERS and other settings in .env
npm start
```

Use `npm run audit` to verify the live command registry remains at exactly 430 commands. Use `npm test` for the mocked command/core test suite.

## Menu navigation

- `.menu` — 27 menu sections and `.allmenu`
- `.allmenu` — all public commands
- `.vip` — request owner-issued VIP access
- `.vipmenu` — VIP command menu after redeeming a key

Some owner/VIP-only commands remain hidden from public menus and enforce permission checks in their handlers.

## Free/open-source integrations

No paid media API is required. Media processing is performed locally on the bot host where possible:

| Feature | Free/open-source tool |
|---|---|
| Image processing, resize, crop, blur, compression | Sharp |
| Video/audio conversion and filters | FFmpeg + fluent-ffmpeg |
| Social/video downloads | yt-dlp (use only for content you are allowed to download) |
| Background removal | rembg CPU model (optional local install) |
| OCR | Tesseract OCR (optional local install) |
| Text-to-speech | espeak-ng (optional local install) |
| QR creation / decode | qrencode / zbarimg (optional local install) |
| Text AI | Local Ollama model, no key required |
| Translation | Public LibreTranslate instances; availability/rate limits vary |
| Weather | Open-Meteo geocoding + forecast endpoints |
| Knowledge lookup | Wikipedia public API |
| URL shortening | is.gd public endpoint |

Install optional host tools on Debian/Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg tesseract-ocr espeak-ng qrencode zbar-tools python3-pip
python3 -m pip install --user -U yt-dlp rembg[cpu]
```

For local AI, install Ollama from its official open-source distribution, then pull a model, for example:

```bash
ollama pull llama3.2:3b
```

The bot tries `http://127.0.0.1:11434` by default. Configure `OLLAMA_URL` and `OLLAMA_MODEL` if needed. Optional `GEMINI_API_KEY` fallback remains supported but is not required for the local Ollama path.

Free public endpoints can rate-limit, be unavailable, or change their terms. A command reports that condition rather than claiming it succeeded. Optional local tools must be installed on the deployment host for the corresponding media feature to work.

## Permissions and safety

- Group moderation and anti controls require group-admin permissions.
- Bot-wide control commands require the configured owner.
- Anti-bug features are defensive: detect, log, and mitigate suspicious content; they do not execute or retaliate with malicious payloads.
- Group moderation records are scoped to the relevant group.
- Download commands rely on yt-dlp and must be used only for content you have permission to download.

## Verification

The source audit checks the actual runtime `commandMap`, not just menu text:

```bash
npm run audit
npm test
```

The automated suite uses a mocked WhatsApp socket. It verifies command loading and mocked behavior, but cannot prove live WhatsApp pairing, delivery, external public-source uptime, or host-installed media binaries. Those require deployment and a test WhatsApp account.

## Multi-user dashboard note

This directory is the upgraded bot source. For a multi-customer deployment, each customer must have a separate Baileys auth directory, data directory, and bot process/session manager. Do not point multiple WhatsApp numbers at the same auth folder. The dashboard/API integration package should provision those per-user paths and route commands/status to the correct session.

### VIP key duration
Owner-generated VIP keys use `.vipgen <duration>` with `m`, `h`, or `d` units (for example `.vipgen 30m`, `.vipgen 12h`, `.vipgen 7d`). The same duration is applied to VIP access after redemption; the key's redemption deadline is separate. Keys are one-use. Invalid and zero-length durations are rejected.
