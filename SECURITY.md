# Security model & deploy order

## Model (Tier 2)

- **All Supabase access requires an authenticated session.** Kid devices get an
  anonymous session (`supabase.auth.signInAnonymously()` on boot); the parent
  upgrades to a Google session. RLS policies are `for all to authenticated`, so
  the bundled anon key on its own grants nothing.
- **PINs are never exposed to the client.** Kid PINs live in `profile_pins`, a
  table with RLS enabled and **no policy** — only the `service_role` key (used by
  `/api/pin`) can read/write it. PINs are salted-scrypt hashed. The client only
  sees `profiles.has_pin` (a boolean) and verifies/sets PINs via `/api/pin`.
- **Destructive + paid operations run server-side** behind the `service_role`
  key and a session check:
  - `/api/import-data` (wipe + restore) requires a **non-anonymous** (Google) session.
  - `/api/generate-drills`, `/api/notify`, `/api/subscribe` require any valid session.
  - `/api/cron/*` require the `CRON_SECRET` bearer token.

### Residual risk (be aware)
Anyone can still mint an anonymous session with the public anon key, so the
*non-PIN* family data (drills, goals, logs) is readable/writable by a determined
authenticated caller. PINs, the data wipe, and the AI/push endpoints are
protected. Closing the remaining gap means per-user identity (Tier 3).

## Required environment variables
See `.env.example`. In Vercel, set every **server-only** var (no `VITE_` prefix)
in addition to the client vars. The most important new one is
`SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`.

## Enable anonymous sign-ins
In the Supabase dashboard: **Authentication → Sign In / Providers → Anonymous
Sign-ins → Enable**. Without this, the app cannot establish a session and all
reads/writes fail after the migration.

## Deploy order (IMPORTANT — do not reorder)

1. **Add env vars** in Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
   (and confirm `VITE_VAPID_PUBLIC_KEY`, `VAPID_*`, `ANTHROPIC_API_KEY` exist).
2. **Enable Anonymous sign-ins** in Supabase (above).
3. **Deploy the app** (this code). The client now establishes a session and
   routes PIN/import through `/api/*`. It still works against the old open RLS.
4. **Run the migration** `supabase/migrations/001_tier2_security.sql` in the
   Supabase SQL editor. This flips RLS to authenticated-only, moves PINs to
   `profile_pins`, and drops `profiles.pin`.

Running step 4 before step 3 would break the live app (old client reads `pin`
and uses the anon key without a session).
