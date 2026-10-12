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
- [ ] Revision table does not reveal email or private data unnecessarily.
- [ ] Deleted/archived records have intentional history visibility.
- [ ] Table grants and RLS policies are both reviewed; policy existence alone is not sufficient.
- [ ] Automated database tests cover select/insert/update/delete for anon, owner, and non-owner.

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
1. Account A signs in, draws a building, adds an address, and saves a draft.
2. Account B confirms the draft is not publicly visible.
3. Account A publishes.
4. Account B sees the building without reloading.
5. Account B tries to edit/delete Account A's building; database authorization denies it.
6. Account A edits height/footprint and publishes a new revision.
7. Account B sees the new revision; the history contains no unnecessary email address.
8. Account A restores the previous revision; the restore creates another revision.
9. Refresh both sessions and verify canonical state remains consistent.
10. Repeat with network interruption during save and verify no partial write occurs.
