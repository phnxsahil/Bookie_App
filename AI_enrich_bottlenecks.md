# Gemini Enrichment bottlenecks (2026-02-18)

- Expired API key returned 400/API_KEY_INVALID; fixed by generating new key and updating `.env.local`.
- Model 404 (`gemini-1.5-flash`) in v1beta; added fallback models (`gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-flash`) and optional `GEMINI_MODEL` env.
- Sandbox network EACCES seen only in restricted environments; not an app issue.
- Supabase UUID error 22P02 when `id` was non-UUID; added API route validation and service-layer guard, so invalid IDs are skipped before DB.
- Success log now emitted only after Supabase update succeeds.
- Tests: `npm run test:gemini` (key+model ping), `npm run test:enrich:guard` (UUID guard).
- Dev server: `npm run dev -- -p 3000`.
