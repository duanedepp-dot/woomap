# TerraLive release and QA checklist

Use this checklist for each preview and production release. Record the date, deployment URL, commit, tester, and results in the pull request.

## Build and configuration
- [ ] CI lint/typecheck/build pass.
- [ ] Preview and production use the intended Supabase URL and public publishable key.
- [ ] No service-role key or private API key appears in the browser bundle, Git history, logs, or public config.
- [ ] Cloudflare KV binding used by geocoding exists in each required environment.
- [ ] Deployment reports success; rollback version is identified.

## Authentication
- [ ] New account registration works.
- [ ] Valid sign-in and sign-out work.
- [ ] Invalid credentials and duplicate account errors are understandable.
- [ ] Refresh preserves a valid session and expired sessions recover safely.
- [ ] Signed-out user cannot publish or edit.

## Authorization / RLS
- [ ] Anonymous user can read only intended published data.
- [ ] Owner can read and edit own permitted records.
- [ ] Second authenticated user cannot update/delete another user's record.
- [ ] Ownership cannot be reassigned through client-supplied fields.
- [ ] Anonymous users have no access to revision history.
- [ ] Revision history is readable only by the building owner or revision actor.
- [ ] Revision history contains no editor email or unnecessary personal data.
- [ ] Deleted building history remains accessible to the owner via snapshot owner ID.
- [ ] Table grants and RLS policies are both reviewed; policy existence alone is not sufficient.
- [ ] Run supabase/tests/terralive_security.sql after migrations.
- [ ] Behavioral allow/deny tests cover select/insert/update/delete for anon, owner, and non-owner.

## Map and addresses
- [ ] Basemap loads with required attribution.
- [ ] Search returns results and displays attribution/provenance.
- [ ] Empty results, timeout, rate limit, and provider errors are handled.
- [ ] Selecting a result moves/centres the map appropriately.
- [ ] User can place and move a pin.
- [ ] Address and coordinates persist after reload.
- [ ] Duplicate-address warnings do not merge distinct units.
- [ ] Community data is not presented as official third-party map data.

## Building editing and publishing
- [ ] User can draw a valid footprint; invalid geometry is rejected.
- [ ] Height, type, floors, dimensions and address relation persist.
- [ ] Preview, cancel, undo/redo and save feedback work.
- [ ] Draft is not visible as published.
- [ ] Publish updates another signed-in browser without manual refresh.
- [ ] Failed save leaves no partial building or revision.
- [ ] Concurrent edit shows a conflict instead of silently overwriting.
- [ ] Revision restore creates a new revision and can be reversed.
- [ ] User cannot edit another person's record without explicit permission.

## Realtime
- [ ] Required tables are enabled in the Realtime publication or Broadcast design.
- [ ] Subscriber permissions allow only intended records.
- [ ] Insert/update/publish/archive events refresh canonical state.
- [ ] Reconnect triggers a fresh read so missed events are recovered.
- [ ] Event payloads do not leak private fields.

## 3D room builder (when implemented)
- [ ] Layout units and schema version are explicit.
- [ ] Doors/windows are true openings, not flat decorative marks.
- [ ] Walkthrough/collision and camera bounds work.
- [ ] Assets have source/license/provenance records.
- [ ] Mesh/texture sizes are bounded and heavy code is lazy-loaded.
- [ ] Save/reopen produces the same room.
- [ ] Low-end mobile smoke test passes.

## Accessibility, performance, and privacy
- [ ] 390px mobile viewport has no unintended horizontal overflow.
- [ ] Keyboard focus and visible focus indicators work.
- [ ] Interactive controls have accessible names.
- [ ] Loading, empty, error and offline states are visible.
- [ ] Bundle-size and runtime performance are measured.
- [ ] Dependency audit findings are triaged.
- [ ] No PII is included in public events or analytics.
- [ ] Backup and restore path is documented.

## Manual two-account acceptance test
1. Use two distinct, non-admin test accounts in a staging project.
2. Account A signs in, draws a building, adds an address, and saves a draft.
3. Account B confirms the draft is not visible and cannot query it through the REST API.
4. Account A publishes.
5. Account B sees the building without reloading.
6. Account B attempts to update/delete Account A's building through the API; it must affect zero rows or return an authorization error.
7. Account B attempts to change owner_id on a row it owns; the database must reject reassignment.
8. Account A edits height/footprint and publishes a new revision; Account B sees the canonical building update live.
9. Account B cannot read Account A's revision history; Account A can read it, with no email field.
10. Account A deletes a test building; its revision history remains readable by A but not B.
11. Refresh both sessions and verify canonical state remains consistent.
12. Interrupt network during save and verify no partial write occurs; retry and inspect the revision count.
13. Record browser, timestamp, test IDs (not passwords), and results in the PR. Never run destructive tests against production data.
