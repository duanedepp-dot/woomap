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
- For Cloudflare's native Pages build, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Settings → Environment variables for Production.
- Keep Preview isolated: set `VITE_WOOMAP_PREVIEW_READ_ONLY=true` and use empty or staging-only Supabase values until a dedicated staging project exists. Never point untrusted previews at production data.
- The current Pages URL remains https://terralive.pages.dev (legacy alias); the Pages project itself is now named WooMap.
- The manual GitHub Actions deploy builds the browser bundle inside GitHub, so also add repository **Variables** (Settings → Secrets and variables → Actions → Variables): `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These are public client configuration values, not service-role secrets. The workflow checks that both exist before deploying.

For a manual GitHub Actions deployment, run **Build and deploy WooMap** from the Actions tab. Configure the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` first. The workflow deploys to the Cloudflare Pages project named `woomap`.

This is a prototype: footprints are rectangular, public map/address services have usage policies, and the starter SQL does not include moderator approval. Harden security and moderation before production.
