# WooMap 🌍
WooMap is a React + TypeScript map prototype using MapLibre GL JS, OpenFreeMap tiles, OpenStreetMap address search, and Supabase.

## Run locally
Requires Node.js 20 or newer.
1. Copy .env.example to .env.local.
2. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (optional for map demo, required for cloud publishing).
3. Run npm install, then npm run dev.

## Supabase
1. Create a project at https://supabase.com/dashboard.
2. Run supabase/schema.sql in the SQL Editor.
3. Copy the project URL and publishable key into .env.local.
4. Enable email/password authentication and configure site/redirect URLs.
Never put a service-role key or database password in browser code.

## Deploy to GitHub Pages
1. Open repository Settings → Pages and set Source to GitHub Actions.
2. Open Settings → Secrets and variables → Actions → Variables.
3. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
4. Open Actions and check the build/deploy workflow.
5. When it succeeds, open Settings → Pages for the public URL.

This is a prototype: footprints are rectangular, public map/address services have usage policies, and the starter SQL does not include moderator approval. Harden security and moderation before production.
