import { createClient } from "@supabase/supabase-js";

const required = [
  "TERRALIVE_TEST_SUPABASE_URL",
  "TERRALIVE_TEST_SUPABASE_KEY",
  "TERRALIVE_TEST_USER_A_EMAIL",
  "TERRALIVE_TEST_USER_A_PASSWORD",
  "TERRALIVE_TEST_USER_B_EMAIL",
  "TERRALIVE_TEST_USER_B_PASSWORD",
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("Missing test-only environment variables:", missing.join(", "));
  process.exit(2);
}

const url = process.env.TERRALIVE_TEST_SUPABASE_URL;
const key = process.env.TERRALIVE_TEST_SUPABASE_KEY;
const makeClient = () => createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const a = makeClient();
const b = makeClient();
const anon = makeClient();
let buildingId;
let channelB;
const checks = [];
const pass = (name) => { checks.push({ name, ok: true }); console.log("PASS", name); };
const fail = (name, detail) => { checks.push({ name, ok: false }); throw new Error(`${name}: ${detail}`); };
const ensure = (condition, name, detail = "assertion failed") => condition ? pass(name) : fail(name, detail);
const waitFor = (promise, ms, label) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), ms);
  promise.then((value) => { clearTimeout(timer); resolve(value); },
    (error) => { clearTimeout(timer); reject(error); });
});

try {
  const loginA = await a.auth.signInWithPassword({
    email: process.env.TERRALIVE_TEST_USER_A_EMAIL,
    password: process.env.TERRALIVE_TEST_USER_A_PASSWORD,
  });
  if (loginA.error || !loginA.data.user) fail("Account A sign-in", loginA.error?.message ?? "no user");
  const loginB = await b.auth.signInWithPassword({
    email: process.env.TERRALIVE_TEST_USER_B_EMAIL,
    password: process.env.TERRALIVE_TEST_USER_B_PASSWORD,
  });
  if (loginB.error || !loginB.data.user) fail("Account B sign-in", loginB.error?.message ?? "no user");
  const userA = loginA.data.user;
  const userB = loginB.data.user;
  ensure(userA.id !== userB.id, "two distinct test accounts");

  const polygon = {
    type: "Polygon",
    coordinates: [[[3.421,6.428],[3.4212,6.428],[3.4212,6.4282],[3.421,6.4282],[3.421,6.428]]],
  };
  const inserted = await a.from("buildings").insert({
    owner_id: userA.id,
    name: "TerraLive security test " + new Date().toISOString(),
    address: "TerraLive automated test fixture",
    building_type: "Apartment",
    height_m: 12,
    footprint_geojson: polygon,
    status: "published",
  }).select("id").single();
  if (inserted.error || !inserted.data?.id) fail("Account A creates published building", inserted.error?.message ?? "no row");
  buildingId = inserted.data.id;
  pass("Account A creates and publishes immediately");

  const bInitialRead = await b.from("buildings").select("id,status").eq("id", buildingId);
  if (bInitialRead.error) fail("Account B reads published building", bInitialRead.error.message);
  ensure((bInitialRead.data ?? []).length === 1 && bInitialRead.data[0].status === "published",
    "Account B can read published building");
  const anonInitialRead = await anon.from("buildings").select("id,status").eq("id", buildingId);
  if (anonInitialRead.error) fail("Anonymous reads published building", anonInitialRead.error.message);
  ensure((anonInitialRead.data ?? []).length === 1, "Anonymous can read published building");

  let liveResolve;
  const liveEvent = new Promise((resolve) => { liveResolve = resolve; });
  channelB = b.channel("terralive-security-test-" + buildingId)
    .on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "buildings", filter: "id=eq." + buildingId,
    }, (payload) => liveResolve(payload))
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        liveResolve({ __subscriptionError: status });
      }
    });
  await waitFor(new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      if (channelB.state === "joined") resolve();
      else if (Date.now() - started > 8000) reject(new Error("Account B Realtime subscription did not join"));
      else setTimeout(poll, 100);
    };
    poll();
  }), 9000, "Realtime subscription");

  const updated = await a.from("buildings").update({ height_m: 18 })
    .eq("id", buildingId).select("id,status,height_m").single();
  if (updated.error) fail("Account A edits own published building", updated.error.message);
  ensure(updated.data.status === "published" && Number(updated.data.height_m) === 18,
    "Account A edit is saved without leaving published state");

  const event = await waitFor(liveEvent, 10000, "Account B live update event");
  ensure(!event.__subscriptionError && event.new?.status === "published" && Number(event.new?.height_m) === 18,
    "Account B receives live edit without reload", event.__subscriptionError ?? JSON.stringify(event.new));

  const bReadsPublished = await b.from("buildings").select("id,status,height_m").eq("id", buildingId);
  if (bReadsPublished.error) fail("Account B reads published building", bReadsPublished.error.message);
  ensure((bReadsPublished.data ?? []).length === 1 && bReadsPublished.data[0].status === "published" && Number(bReadsPublished.data[0].height_m) === 18,
    "Account B reads canonical published building and latest edit");
  const anonReadsPublished = await anon.from("buildings").select("id,status").eq("id", buildingId);
  if (anonReadsPublished.error) fail("Anonymous reads published building", anonReadsPublished.error.message);
  ensure((anonReadsPublished.data ?? []).length === 1, "Anonymous can read published building");

  const bUpdate = await b.from("buildings").update({ name: "UNAUTHORIZED UPDATE" }).eq("id", buildingId).select("id");
  ensure(!bUpdate.error && (bUpdate.data ?? []).length === 0,
    "Account B cannot update Account A building", bUpdate.error?.message ?? "row changed");
  const bDelete = await b.from("buildings").delete().eq("id", buildingId).select("id");
  ensure(!bDelete.error && (bDelete.data ?? []).length === 0,
    "Account B cannot delete Account A building", bDelete.error?.message ?? "row deleted");

  const reassign = await a.from("buildings").update({ owner_id: userB.id }).eq("id", buildingId).select("id");
  ensure(Boolean(reassign.error) || (reassign.data ?? []).length === 0,
    "Owner cannot reassign ownership", "database accepted owner_id reassignment");
  const stillOwned = await a.from("buildings").select("owner_id").eq("id", buildingId).single();
  if (stillOwned.error) fail("Owner record remains accessible", stillOwned.error.message);
  ensure(stillOwned.data.owner_id === userA.id, "Owner remains unchanged");

  const historyA = await a.from("building_revisions")
    .select("id,building_id,revision,action,editor_id,snapshot,created_at").eq("building_id", buildingId);
  if (historyA.error) fail("Account A reads own revision history", historyA.error.message);
  ensure((historyA.data ?? []).length >= 2, "Account A reads revision history");
  const historyB = await b.from("building_revisions")
    .select("id,building_id,revision,action,editor_id,snapshot,created_at").eq("building_id", buildingId);
  if (historyB.error) fail("Account B history query", historyB.error.message);
  ensure((historyB.data ?? []).length === 0, "Account B cannot read Account A revision history");
  const historyAnon = await anon.from("building_revisions")
    .select("id,building_id,revision,action,editor_id,snapshot,created_at").eq("building_id", buildingId);
  ensure(Boolean(historyAnon.error), "Anonymous cannot query revision history");

  const deletion = await a.from("buildings").delete().eq("id", buildingId).select("id");
  if (deletion.error || (deletion.data ?? []).length !== 1) fail("Account A cleans up test building", deletion.error?.message ?? "row not deleted");
  buildingId = undefined;
  const historyAfterDelete = await a.from("building_revisions")
    .select("id,building_id,revision,action,editor_id,snapshot,created_at").eq("building_id", inserted.data.id);
  if (historyAfterDelete.error) fail("Owner reads deletion history", historyAfterDelete.error.message);
  ensure((historyAfterDelete.data ?? []).length >= 3, "Owner retains history after delete");
  const otherHistoryAfterDelete = await b.from("building_revisions")
    .select("id,building_id,revision,action,editor_id,snapshot,created_at").eq("building_id", inserted.data.id);
  ensure(!otherHistoryAfterDelete.error && (otherHistoryAfterDelete.data ?? []).length === 0,
    "Other account still cannot read deleted building history");

  console.log(`\nAll ${checks.length} TerraLive two-account checks passed.`);
} catch (error) {
  console.error("\nTerraLive security smoke test failed:", error);
  process.exitCode = 1;
} finally {
  if (channelB) await b.removeChannel(channelB);
  if (buildingId) {
    await a.from("buildings").delete().eq("id", buildingId);
  }
  await Promise.all([a.auth.signOut(), b.auth.signOut(), anon.auth.signOut()]);
}
