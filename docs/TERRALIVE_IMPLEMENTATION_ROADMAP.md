# TerraLive implementation roadmap

**Product:** TerraLive  
**Tagline:** The world, updated live.  
**Purpose:** A collaborative geographic map where people can propose, edit, and publish address records and building geometry, then explore those buildings in 3D.

## Product promise and boundaries

- Changes publish to TerraLive's own dataset after validation and authorization; do not claim to modify Google Maps, Apple Maps, official postal databases, or third-party basemaps.
- A published record is shared app data, not proof that an address or building is officially verified.
- Preserve the current architecture: MapLibre GL JS, OpenFreeMap, Supabase Auth, PostgreSQL/PostGIS, Supabase Realtime, Cloudflare Pages/Workers, and a later Three.js interior viewer/editor.
- Postman is optional QA tooling, not a runtime dependency. A WooMap API is not required unless a separately identified service provides a feature the app actually needs.

## Confirmed product settings

- **Publishing method: publish immediately.** A successful save of a valid building/address change publishes it to TerraLive straight away; no separate review/publish click is required for the default workflow. If a draft mode is ever added later, it must be an explicit opt-in and must not be the default.
- **Editing permissions: registered users can edit and publish their own changes.** An authenticated user may create and edit records they own. They cannot edit, delete, or take ownership of another user's record unless a separately designed sharing/role feature explicitly grants that permission.
- **Public visibility:** anonymous visitors and other registered users can read published records. Drafts, if introduced later, must not be exposed through public map queries.
- **Meaning of “live”:** a committed database change becomes canonical in TerraLive and is sent to authorized subscribers through Supabase Realtime; clients update without manual refresh and refetch canonical data after reconnect. This does not update Google Maps, Apple Maps, official postal databases, or OpenFreeMap's source data.
- **Revision history:** every committed change is audited with actor ID, action, revision and timestamp. Keep revision history private to the building owner and authorized actor; do not expose editor email addresses. Restoring an older revision creates a new revision rather than erasing history.

## Target architecture (preserve existing choices)

- **Map UI:** MapLibre GL JS; **basemap:** OpenFreeMap with required attribution.
- **Data and identity:** Supabase Auth, PostgreSQL and PostGIS. Database Row Level Security (RLS) is the source of truth for read/write permissions.
- **Live updates:** Supabase Realtime. Keep Postgres Changes for the MVP if the two-account tests pass; evaluate private Broadcast channels as usage grows.
- **Hosting/API:** Cloudflare Pages and Workers, retaining existing KV bindings and geocoding endpoint. Public browser config may include only the Supabase URL and publishable/anon key—never the service-role key.
- **3D:** keep MapLibre building extrusions for the city-scale overview; use validated editable footprints and dimensions; introduce Three.js for selected-building detail and a later room/interior editor. Keep heavy 3D code and assets lazy-loaded and store large assets in object storage rather than oversized database rows.

## Publish-immediately write contract

1. A signed-in user draws or selects a building and edits its name, address, type, height or footprint.
2. The client validates required fields and geometry, then submits a single authenticated write with the current user's ID as owner.
3. The database checks RLS and constraints, normalizes/validates geometry, updates the revision/version, and records an audit revision in the same transaction.
4. The saved row is marked `published` for the default workflow. If the write fails, the UI reports the error and does not claim success.
5. Authorized Realtime subscribers receive a minimal change signal and refresh the canonical row; a second session sees the change without manual refresh.
6. On reconnect, the client refetches canonical published records so missed events are recovered.
7. Concurrent edits must use a revision/version or `updated_at` check so one user's edit cannot silently overwrite a newer version.

**Security rule:** hiding controls in the UI is not authorization. The database must reject cross-owner update/delete and owner reassignment even when requests are made directly through the REST API.

## Current baseline

The existing app already has a map workspace, address geocoding endpoint, Supabase client/auth code, building geometry and extrusion support, a buildings table, row-level security policies, revision auditing, and a Realtime subscription. A preview configuration/UI fix is being reviewed in PR #2. Do not treat the 3D interior editor, secure cross-account publishing, or production authorization tests as complete until verified.

## Delivery phases

### P0 — Release correctness and recovery

- Review and merge the production configuration fix only after the PR checks and preview are verified.
- Verify Cloudflare production and preview build variables separately; never put a Supabase service-role key in frontend variables.
- Verify production status text reflects actual configuration, auth state, loading state, and failures.
- Add a rollback procedure and a post-deploy smoke test.
- Resolve the reported high-severity dependency audit item after confirming the affected package/path and safe remediation; do not blindly force a major upgrade.

**Exit criteria:** production build succeeds, correct Supabase project initializes, sign-in is usable, published map loads, address search works, and rollback is documented.

### P1 — Secure collaborative publishing

- Test registration, sign-in, sign-out, expired sessions, and errors.
- Test account A saves a valid building change and it is published immediately; account B sees it without reload.
- Test account B cannot update/delete account A's building without an explicit permission.
- Use database RLS as the authorization boundary; UI-only restrictions do not count.
- Add optimistic concurrency (compare revision/updated_at) to prevent silent overwrites.
- Make save/publish atomic. A failed write must not partially update the building or revision.
- Keep deletion history accessible to the owner. Prefer archive/soft-delete for user-facing deletion; if hard delete remains, preserve owner access through the revision snapshot.
- Verify the Realtime publication includes required tables and RLS permits intended subscribers. Test actual events, not just successful WebSocket subscription.

**Exit criteria:** automated allow/deny tests pass for anon, owner, and another authenticated user; changes propagate; reconnect/reload returns the authoritative database state.

### P2 — Address management as a first-class entity

Create a dedicated `addresses` model rather than requiring every address to be embedded in a building. Recommended fields:

- UUID, normalized display address, address components when available, latitude/longitude, PostGIS point, source/provider, verification status, creator, created/updated timestamps.
- Optional links to one or more building records.
- Unique/deduplication strategy that does not incorrectly merge apartment units or similar addresses.
- Change history and correction/report workflow.

UX:
- Search and choose a geocoding result; show provider attribution.
- Add a pin by clicking the map; drag it to refine coordinates.
- Edit address text and structured fields; validate coordinates and required fields.
- Display confidence/verification status and explain that community edits do not change external map providers.
- Handle geocoding timeout, no result, provider error, rate limit, and retry.

**Exit criteria:** add/edit/move pin persists, reload reproduces it, duplicate warnings are understandable, and other users see published updates.

### P3 — Building footprint and 3D editor

- Draw, move, rotate, resize, and reshape footprints with clear vertex controls.
- Validate polygons (closed ring, minimum points, valid geometry, non-zero area, plausible size).
- Set building type, height in metres, floors, dimensions, name, and linked address.
- Keep units explicit and convert safely; do not infer floor count solely from height.
- Preview before saving; support cancel, undo/redo, save draft, publish, and revision restore.
- Add keyboard and touch controls; avoid relying only on hover.
- Show draft/published status and conflict warnings.
- Keep MapLibre extrusions as the fast geographic representation; reserve detailed meshes for selected buildings or interiors.

**Exit criteria:** a 52 m apartment can be edited, saved, reloaded, rendered consistently, and published to another session.

### P4 — 3D room/interior builder

Start with a procedural, editable MVP before paid asset generation:

- Floor plan with room outline and metric dimensions.
- Wall thickness, floor and ceiling; doors and windows with actual openings.
- Furniture library with placement, rotation, scale bounds, snap/grid and collision checks.
- Orbit and first-person navigation; clear exit back to the geographic map.
- Save structured room data separately from large mesh/texture files.
- Use Three.js for the viewer/editor; store large assets in object storage (Supabase Storage or Cloudflare R2), not large database JSON rows.
- Lazy-load the 3D editor and assets so the core map stays fast on mobile.
- Require review gates for concept/layout, geometry/openings, export, and runtime. Do not spend on paid model generation until a specific asset is approved and current pricing is checked.

**Exit criteria:** room can be saved/reopened, doors/windows are traversable and visually real, mobile performance is acceptable, and the exported asset passes runtime validation.

### P5 — Trust, safety, and moderation

- Distinguish drafts, published community edits, and verified records.
- Provide report/correction, spam controls, request throttling, and audit logs.
- Use server-side validation for every public endpoint; set limits for query length, polygon vertex count, geometry size, uploads, and request frequency.
- Keep email and private user data out of public revision payloads. Prefer editor user ID and a display name/attribution policy.
- Ensure uploaded 3D files are type/size checked and cannot execute as code.
- Add privacy policy, terms, acceptable-use policy, and data deletion/export procedures before public launch.
- Document retention and backup restoration procedures.

### P6 — Performance, accessibility, and operations

- Investigate the large JavaScript bundle and split heavy editor/3D code into lazy-loaded chunks.
- Measure real page performance before/after changes; avoid optimizing based on bundle size alone.
- Use simplified geometry/LOD and compressed textures for 3D assets.
- Test on lower-end mobile devices and poor network connections.
- Ensure keyboard focus, labelled controls, contrast, error announcements, touch targets, and non-map alternatives for key data.
- Add error monitoring, uptime checks, structured server logs without secrets/PII, database backups, and restore drills.
- Review Cloudflare caching rules so user-specific/authenticated responses are not cached publicly.
- Add CI checks for lint/typecheck/build, database policy tests, and smoke tests.

## Suggested data model

- `addresses`: normalized address, components, point geometry, provenance, verification state, owner/editor metadata.
- `buildings`: address relation, footprint geometry, type, height, floors, dimensions, publication status, owner, revision/version.
- `building_revisions`: immutable snapshots or change records with entity ID, revision, actor ID, action, timestamp, and restoration reference; do not expose editor email by default.
- `rooms`: building relation, floor, structured plan/layout JSON, units, schema version.
- `building_assets`: asset URL/storage key, content type, dimensions, polygon/texture budget, license/provenance, approval status.
- `reports` / `moderation_events`: user-submitted correction reports and action history.
- `memberships` (only if collaboration teams are added): building/project, user, role.

Use PostGIS for spatial indexing and validation; keep relational fields queryable. Version JSON payloads for room layouts.

## Realtime design

For the current MVP, Postgres Changes is acceptable if correctly configured and tested. Before larger scale, evaluate Supabase Broadcast with private channels and authorization. Broadcast only the minimum event needed (entity ID, operation, revision), then refetch authorized canonical data. Do not treat client-supplied events as authoritative database writes.

## Definition of done

A feature is complete only when:
1. It works on desktop and mobile.
2. Data survives reload and a second account sees only authorized data.
3. RLS/permissions are tested at the database layer.
4. Errors and offline/reconnect states are handled.
5. Revision history and restore behavior are tested.
6. Accessibility and performance checks are recorded.
7. No secrets or unnecessary personal data are exposed.
8. A rollback path exists for schema and deployment changes.

## Recommended next action

Finish PR #2 review and production smoke testing, then prioritize cross-account auth/publishing and RLS tests before expanding the 3D feature surface. Do not apply unverified database migrations until the correct Supabase project and backup state are confirmed.
