# Security notes

## Credential exposure response

The repository's earlier `.env.example` contained values in the `GEMINI_API_KEY` and `JWT_SECRET` fields that must be treated as exposed.

Before using this project again:

1. Revoke the exposed Gemini key in the provider console and issue a replacement only if the feature is needed.
2. Replace the exposed JWT secret in the Render environment with a newly generated random value of at least 32 bytes.
3. Review other provider credentials and rotate any value that was ever committed.
4. Do not put live credentials in source files, screenshots, logs, issues, or example files.

Removing a value from the latest commit does not remove it from earlier Git history. Rotation is mandatory even if history is later rewritten.

## Runtime data

Never commit WhatsApp auth state, customer session data, local databases, platform data, or real `.env` files. The root `.gitignore` excludes the standard local secret and runtime-data paths. Verify the ignore rules before adding new storage locations.

## Deployment boundaries

The Vercel dashboard and the persistent Render API/worker are separate services. The browser-facing `NEXT_PUBLIC_API_BASE` must point to the Render API HTTPS origin, never the Vercel dashboard URL. Keep `JWT_SECRET` server-side only.
