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
- [ ] Default Save action publishes immediately; success feedback appears only after the database confirms the write.
- [ ] Anonymous visitors and another signed-in account can read the newly published record.
- [ ] The owner can update their own record and the update appears in another signed-in browser without manual refresh.
- [ ] A registered non-owner cannot update/delete the record through the UI or REST API.
- [ ] The client cannot assign a different owner_id or bypass database geometry/field constraints.
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

## Automated two-account test

Run only against a disposable/staging Supabase project after applying the revision privacy migration and the schema. Create two distinct, non-admin email/password test accounts in that project. Do not point this test at production.

Set these environment variables locally or as protected CI secrets (never commit credentials):
- TERRALIVE_TEST_SUPABASE_URL
- TERRALIVE_TEST_SUPABASE_KEY (publishable/anon key only; never service-role)
- TERRALIVE_TEST_USER_A_EMAIL
- TERRALIVE_TEST_USER_A_PASSWORD
- TERRALIVE_TEST_USER_B_EMAIL
- TERRALIVE_TEST_USER_B_PASSWORD

Then run: npm run test:terralive-security

The script creates a uniquely named draft fixture, tests RLS and live publishing, then deletes that fixture and checks that its revision history remains private. It must pass before this PR is considered release-ready.

## Manual two-account acceptance test
1. Use two distinct, non-admin test accounts in a staging project.
2. Account A signs in, draws a building, adds an address and saves; the successful save must publish immediately.
3. Account B and a signed-out browser see the published building without reloading.
4. Account A edits height/footprint; the save is published immediately and Account B sees the canonical change live.
5. Account B attempts to update/delete Account A's building through the API; it must affect zero rows or return an authorization error.
6. Account B attempts to change owner_id on a row it owns; the database must reject reassignment.
7. Account B cannot read Account A's revision history; Account A can read it, with no email field.
8. Account A deletes a test building; its revision history remains readable by A but not B.
9. Refresh both sessions and verify canonical state remains consistent.
10. Interrupt network during save and verify no partial write occurs; retry and inspect the revision count.
11. Record browser, timestamp, test IDs (not passwords), and results in the PR. Never run destructive tests against production data.
