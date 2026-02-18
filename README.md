<div align="center">
  <img src="public/assets/logo.png" alt="Bookie logo" width="96" />
  <h2>Bookie — Smart Bookmark App</h2>
  <p>Smart bookmarking with Google OAuth, realtime updates, and a focused, minimal UI.</p>
  <p>
    <a href="https://github.com/phnxsahil/Bookie_App">Repo</a>
    ·
    <a href="https://bookieapp.vercel.app">Live Demo</a>
  </p>
</div>

Bookie is my take on a smart bookmarking app. The name comes from “Bake your Bookie” — baking links into organized, useful knowledge. I designed the logo and kept the product name consistent through the UI.

## Requirements
1. Google OAuth only (no email/password).
2. Add bookmark (URL + title).
3. Per‑user privacy (User A cannot see User B’s bookmarks).
4. Realtime updates across tabs.
5. Delete own bookmarks.
6. Deployed on Vercel.

## Tech Stack
- Next.js (App Router)
- Supabase (Auth, Database, Realtime)
- Tailwind CSS

## Live URL
- https://bookieapp.vercel.app

## Repo
- https://github.com/phnxsahil/Bookie_App.git

## Problems & Fixes
- **Gemini integration**
- Approach: start with a minimal health check and a pinned model to keep the surface area small.
- Issue: model 404s after key rotation (`gemini-1.5-flash` not available in `v1beta`).
- Fix: add a short model fallback list plus optional `GEMINI_MODEL`, then verify via the health check.

- **Realtime consistency**
- Approach: rely on Supabase Realtime for cross‑tab updates.
- Issue: inserts/updates occasionally missed across tabs.
- Fix: enable `replica identity full`, confirm `bookmarks` in `supabase_realtime`, and add client refetch on focus with a 10s safety poll.

- **Auth refresh stability**
- Approach: use Supabase SSR helpers for sessions.
- Issue: stale cookies triggered `refresh_token_not_found` in middleware.
- Fix: clear auth cookies on refresh failure and continue unauthenticated.

- **Input validation**
- Approach: enrich bookmarks via API calls.
- Issue: non‑UUID test ids caused DB errors.
- Fix: enforce UUID guards at the API boundary and service layer before DB writes.

## Local Dev
```bash
npm install
npm run dev
```
