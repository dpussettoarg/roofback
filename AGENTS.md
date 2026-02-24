# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

RoofBack is a Next.js 16 (App Router) mobile-first PWA for Latino roofing contractors. All backend logic runs as Next.js API routes and Server Actions. External services (Supabase, Stripe, Anthropic) are consumed via their APIs — no local Docker or database setup is needed.

### Running the app

- `npm run dev` — starts the dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)

See `README.md` for full setup steps.

### Environment variables

A `.env.local` file is required. At minimum it needs:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Without real Supabase credentials the app will render the login/signup pages but API calls will fail with "Failed to fetch". Optional vars: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.

### Gotchas

- The codebase has pre-existing lint errors (10 errors, 23 warnings) that are not blockers — `npm run lint` exits with code 1 due to these.
- Next.js 16 shows a deprecation warning about `middleware.ts` suggesting migration to `proxy`. This is expected and does not affect functionality.
- The middleware uses `!` (non-null assertion) for Supabase env vars. The app will still start with placeholder values, but middleware auth checks will fail silently for protected routes, redirecting unauthenticated users to `/login`.
- **Restart required after `.env.local` changes**: The Next.js dev server does not hot-reload changes to `.env.local`. You must kill the dev server and restart it with `npm run dev` for new env var values to take effect.
- Supabase has email confirmation enabled by default. Signups succeed but the user must confirm via email before logging in. To bypass this for testing, disable "Enable email confirmations" in the Supabase dashboard under Authentication → Providers → Email.
