# WooMap 🌍
**The world, updated live.**

WooMap is a React + TypeScript interactive map prototype using MapLibre GL JS, OpenFreeMap tiles, OpenStreetMap address search, and Supabase/PostGIS for building data and live updates.

## Run locally
Requires Node.js 20 or newer.
1. Copy .env.example to .env.local.
2. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (optional for demo mode, required for cloud publishing).
3. Run npm install, then npm run dev.

## Supabase
1. Create a project at https://supabase.com/dashboard.
2. Run supabase/schema.sql in the SQL Editor.
3. Set the project URL and publishable key in your local environment.
4. Enable email/password authentication and configure site/redirect URLs.
Never put a service-role key or database password in browser code.

## Deploy to Cloudflare Pages
The repository is configured for a static Vite build:
- Production branch: main
- Build command: npm run build
- Build output directory: dist
- Supabase variables must be set in the Cloudflare Pages project under Settings → Environment variables for Production (and Preview if used): VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
- The public URL is https://woomap.pages.dev. Production and Preview must both define `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Cloudflare Pages.

This is a prototype: footprints are rectangular, public map/address services have usage policies, and the starter SQL does not include moderator approval. Harden security and moderation before production.
