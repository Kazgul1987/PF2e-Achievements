import test from "node:test";
import assert from "node:assert/strict";

const values = new Map();
const registrations = [];
globalThis.foundry = { utils: {
  deepClone: value => structuredClone(value),
  randomID: (() => { let id = 0; return () => `generated-${++id}`; })(),
  mergeObject: (base, changes) => ({ ...structuredClone(base), ...structuredClone(changes) })
}};
globalThis.Hooks = { once: (_name, callback) => registrations.push(callback) };
globalThis.window = {};
globalThis.game = {
  user: { isGM: true },
  modules: new Map([["PF2e-Achievements", { version: "test" }]]),
  settings: {
    register: (_namespace, key, data) => { if (!values.has(key)) values.set(key, structuredClone(data.default)); },
    get: (_namespace, key) => values.get(key),
    set: async (_namespace, key, value) => { values.set(key, structuredClone(value)); return value; }
  }
};

const model = await import("../scripts/achievement-data.js");
registrations.forEach(callback => callback());

test("migration preserves the union of legacy player data and is idempotent", async () => {
  values.set("achievementdataNEW", JSON.stringify([{
    name: "Critical Master", description: "Description", image: "icon.webp", points: 10,
    players: ["abc", "def"], seenBy: ["abc", "seen-only"],
    playerDates: { abc: 1720000000000, def: 1721000000000, "date-only": 42 },
    playerProgress: { abc: 3, "progress-only": 2 }, progressRequired: 5, progressType: "counter"
  }]));
  assert.equal(await model.migrateAchievementSchema(), true);
  const definitions = values.get("achievementDefinitions");
  const state = values.get("achievementState");
  assert.equal(definitions[0].progress.required, 5);
  assert.deepEqual(Object.keys(state[definitions[0].id].players).sort(), ["abc", "date-only", "def", "progress-only", "seen-only"]);
  assert.equal(state[definitions[0].id].players.abc.unlockedAt, 1720000000000);
  assert.equal(state[definitions[0].id].players.abc.progress, 3);
  assert.equal(state[definitions[0].id].players["seen-only"].seen, true);
  assert.equal(values.get("achievementSchemaVersion"), 2);
  assert.equal(await model.migrateAchievementSchema(), false);
  assert.equal(values.get("achievementDefinitions")[0].id, definitions[0].id);
});

test("normal packs discard runtime fields and update keeps world state", async () => {
  const id = values.get("achievementDefinitions")[0].id;
  const before = structuredClone(values.get("achievementState")[id]);
  const pack = { format: "pf2e-achievements", version: 1, achievements: [{
    id, name: "Renamed", points: 20, players: ["intruder"], seenBy: ["intruder"], playerProgress: { intruder: 99 }
  }] };
  await model.importAchievements(pack, { behavior: "update" });
  assert.equal(values.get("achievementDefinitions")[0].name, "Renamed");
  assert.deepEqual(values.get("achievementState")[id], before);
  assert.equal(values.get("achievementState")[id].players.intruder, undefined);
});

test("legacy array imports remain supported", async () => {
  const result = await model.importAchievements([{ name: "Legacy Pack Entry" }]);
  assert.equal(result.imported, 1);
  assert.ok(values.get("achievementDefinitions").some(item => item.name === "Legacy Pack Entry" && item.id));
});

test("delimiter migration is awaited before schema v2 and preserves unlocks", async () => {
  values.set("achievementDefinitions", []); values.set("achievementState", {}); values.set("achievementSchemaVersion", 1);
  values.set("achievementdataNEW", "");
  values.set("achievementdata", "1:::First////one.webp////One;;;2:::Second////two.webp////Two;;;");
  values.set("clientdataSYNC", "user-a:0,||user-b:1,");
  let writeFinished = false;
  const originalSet = game.settings.set;
  game.settings.set = async (namespace, key, value) => {
    if (key === "achievementdataNEW") await new Promise(resolve => setTimeout(resolve, 20));
    const result = await originalSet(namespace, key, value);
    if (key === "achievementdataNEW") writeFinished = true;
    if (key === "achievementDefinitions") assert.equal(writeFinished, true);
    return result;
  };
  try { assert.equal(await model.migrateAchievements(), true); } finally { game.settings.set = originalSet; }
  const definitions = values.get("achievementDefinitions");
  assert.equal(definitions.length, 2);
  assert.equal(values.get("achievementState")[definitions[0].id].players["user-a"].unlocked, true);
  assert.equal(values.get("achievementState")[definitions[1].id].players["user-b"].unlocked, true);
  assert.equal(values.get("achievementSchemaVersion"), 2);
});

test("failed delimiter write never advances schema version or changes legacy data", async () => {
  values.set("achievementDefinitions", []); values.set("achievementState", {}); values.set("achievementSchemaVersion", 1);
  values.set("achievementdataNEW", ""); values.set("achievementdata", "1:::Safe////safe.webp////Still here;;;"); values.set("clientdataSYNC", "");
  const originalSet = game.settings.set;
  game.settings.set = async (namespace, key, value) => { if (key === "achievementdataNEW") throw new Error("disk full"); return originalSet(namespace, key, value); };
  try { await assert.rejects(model.migrateAchievements(), /disk full/); } finally { game.settings.set = originalSet; }
  assert.equal(values.get("achievementSchemaVersion"), 1);
  assert.equal(values.get("achievementdata"), "1:::Safe////safe.webp////Still here;;;");
});

test("store mutations use IDs, preserve repeat-unlock time, and reset time after lock", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "A1", name: "Secret Found" }, { id: "A2", name: "Secret Found" }]);
  await model.AchievementStore.saveState({});
  const first = await model.AchievementStore.unlock("A1", "user");
  await new Promise(resolve => setTimeout(resolve, 2));
  const repeated = await model.AchievementStore.unlock("A1", "user");
  assert.equal(repeated.unlockedAt, first.unlockedAt);
  await model.AchievementStore.setProgress("A2", "user", 7);
  assert.equal(model.AchievementStore.getPlayerState("A1", "user").progress, 0);
  assert.equal(model.AchievementStore.getPlayerState("A2", "user").progress, 7);
  await model.AchievementStore.lock("A1", "user");
  assert.equal(model.AchievementStore.getPlayerState("A1", "user").unlockedAt, null);
  const unlockedAgain = await model.AchievementStore.unlock("A1", "user");
  assert.notEqual(unlockedAgain.unlockedAt, null);
});

test("import rejects foreign formats and future versions without changing data", async () => {
  const before = structuredClone(values.get("achievementDefinitions"));
  await assert.rejects(model.importAchievements({ format: "other", version: 1, achievements: [] }), /Unsupported achievement pack format/);
  await assert.rejects(model.importAchievements({ format: "pf2e-achievements", version: 999, achievements: [] }), /Unsupported achievement pack version 999/);
  assert.deepEqual(values.get("achievementDefinitions"), before);
});

test("definition-only overwrite never changes existing world state", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "A", name: "A" }, { id: "B", name: "B" }]);
  await model.AchievementStore.saveState({ A: { players: { u: { unlocked: true } } }, B: { players: {} } });
  const result = await model.importAchievements({ format: "pf2e-achievements", version: 1, achievements: [{ id: "A", name: "Updated" }, { id: "C", name: "C" }] }, { behavior: "overwrite" });
  assert.equal(result.imported, 2);
  assert.deepEqual(Object.keys(values.get("achievementState")), ["A", "B"]);
  assert.equal(values.get("achievementState").A.players.u.unlocked, true);
});

test("legacy seen names migrate only when unique and survive renames by ID", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "seen-id", name: "Lucky" }, { id: "d1", name: "Duplicate" }, { id: "d2", name: "Duplicate" }]);
  await model.AchievementStore.saveState({});
  const user = { id: "u", getFlag: async () => ["Lucky", "Duplicate"] };
  await model.migrateLegacySeenFlags([user]);
  assert.equal(model.AchievementStore.getPlayerState("seen-id", "u").seen, true);
  assert.equal(model.AchievementStore.getPlayerState("d1", "u").seen, false);
  await model.AchievementStore.updateAchievement("seen-id", { name: "Renamed" });
  assert.equal(model.AchievementStore.getPlayerState("seen-id", "u").seen, true);
});

test("pagination source sees definitions imported after initial render", async () => {
  await model.AchievementStore.saveDefinitions(Array.from({ length: 100 }, (_, index) => ({ id: `old-${index}`, name: `Old ${index}` })));
  const pack = { format: "pf2e-achievements", version: 1, achievements: Array.from({ length: 50 }, (_, index) => ({ id: `new-${index}`, name: `New ${index}` })) };
  await model.importAchievements(pack, { behavior: "duplicate" });
  assert.equal(model.AchievementStore.getDefinitions().length, 150);
});

test("dice progress and chain mutations retain stable IDs and definition data", async () => {
  await model.AchievementStore.saveDefinitions([
    { id: "natural-one", name: "Unlucky", progressType: "dice", progressRequired: "1", diceType: "d20" },
    { id: "chain", name: "Lucky Streak", progressType: "diceChain", progressRequired: "20", chainLength: 2, diceType: "d20" }
  ]);
  await model.AchievementStore.saveState({});
  const definitionsBefore = structuredClone(model.AchievementStore.getDefinitions());

  await model.AchievementStore.processDiceRoll({ formula: "1d20 + 12", total: 13, natural: 1 }, "roller");
  assert.equal(model.AchievementStore.getPlayerState("natural-one", "roller").unlocked, true);
  assert.equal(model.AchievementStore.getPlayerState("chain", "roller").progress, 0);

  await model.AchievementStore.processDiceRoll({ formula: "1d20 + 5", total: 25, natural: 20 }, "roller");
  assert.equal(model.AchievementStore.getPlayerState("chain", "roller").progress, 1);
  await model.AchievementStore.processDiceRoll({ formula: "1d20 + 5", total: 25, natural: 20 }, "roller");
  const chainState = model.AchievementStore.getPlayerState("chain", "roller");
  assert.equal(chainState.unlocked, true);
  assert.ok(chainState.unlockedAt);
  assert.deepEqual(model.AchievementStore.getDefinitions(), definitionsBefore);
});

test("dice chain failure resets only the correct user's state", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "chain-reset", name: "Chain", progressType: "diceChain", progressRequired: ">10", chainLength: 3, diceType: "d20" }]);
  await model.AchievementStore.saveState({});
  await model.AchievementStore.processDiceRoll({ formula: "1d20", total: 15, natural: 15 }, "u1");
  await model.AchievementStore.setProgress("chain-reset", "u2", 2);
  await model.AchievementStore.processDiceRoll({ formula: "1d20", total: 4, natural: 4 }, "u1");
  assert.equal(model.AchievementStore.getPlayerState("chain-reset", "u1").progress, 0);
  assert.equal(model.AchievementStore.getPlayerState("chain-reset", "u2").progress, 2);
  assert.equal(model.AchievementStore.getDefinition("chain-reset").name, "Chain");
});

test("unlockMany uses user IDs, excludes duplicates, and preserves dates and seen state", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "everyone", name: "Everyone" }]);
  await model.AchievementStore.saveState({});
  await model.AchievementStore.setSeen("everyone", "user-a", true);
  await model.AchievementStore.unlockMany("everyone", ["user-a", "user-b", "user-a"]);
  const firstDate = model.AchievementStore.getPlayerState("everyone", "user-a").unlockedAt;
  await model.AchievementStore.unlockMany("everyone", ["user-a"]);
  assert.equal(model.AchievementStore.getPlayerState("everyone", "user-a").unlockedAt, firstDate);
  assert.equal(model.AchievementStore.getPlayerState("everyone", "user-a").seen, true);
  assert.equal(model.AchievementStore.getPlayerState("everyone", "user-b").unlocked, true);
  assert.deepEqual(model.AchievementStore.getDefinitions().map(item => item.id), ["everyone"]);
});

test("saveLegacyView safely matches reordered id-less entries rather than using indexes", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "A", name: "Alpha" }, { id: "B", name: "Beta" }, { id: "C", name: "Gamma" }]);
  await model.AchievementStore.saveState({ A: { players: { u: { unlocked: true, seen: true, unlockedAt: 42, progress: 3 } } } });
  const reordered = model.AchievementStore.getLegacyView().map(({ id: _id, ...item }) => item);
  await model.AchievementStore.saveLegacyView([reordered[1], reordered[0], reordered[2]]);
  assert.deepEqual(model.AchievementStore.getDefinitions().map(item => item.id), ["B", "A", "C"]);
  assert.equal(model.AchievementStore.getPlayerState("A", "u").unlockedAt, 42);
});

test("empty debug reset clears definitions and state without enabling legacy remigration", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "reset-me", name: "Reset" }]);
  await model.AchievementStore.unlock("reset-me", "u");
  values.set("achievementSchemaVersion", 2);
  await model.AchievementStore.resetAll();
  assert.deepEqual(values.get("achievementDefinitions"), []);
  assert.deepEqual(values.get("achievementState"), {});
  assert.equal(values.get("achievementSchemaVersion"), 2);
  values.set("achievementdataNEW", JSON.stringify([{ name: "Must not return" }]));
  assert.equal(await model.migrateAchievementSchema(), false);
  assert.deepEqual(model.AchievementStore.getDefinitions(), []);
});

test("lock is lossless for progress, seen, other users, definitions, and extension fields", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "lock-id", name: "Lock" }]);
  await model.AchievementStore.saveState({ "lock-id": { players: {
    one: { unlocked: true, unlockedAt: 42, seen: true, progress: 7, extension: "keep" },
    two: { unlocked: true, unlockedAt: 9, seen: false, progress: 2 }
  } } });
  const definitions = model.AchievementStore.getDefinitions();
  await model.AchievementStore.lock("lock-id", "one");
  assert.deepEqual(model.AchievementStore.getPlayerState("lock-id", "one"), { unlocked: false, unlockedAt: null, seen: true, progress: 7, extension: "keep" });
  assert.equal(model.AchievementStore.getPlayerState("lock-id", "two").unlocked, true);
  assert.deepEqual(model.AchievementStore.getDefinitions(), definitions);
});

test("progress is ID-specific, non-negative, capped, and never mutates definitions", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "p-a", name: "Same", progressRequired: 5 }, { id: "p-b", name: "Same", progressRequired: 10 }]);
  await model.AchievementStore.saveState({ "p-b": { players: { other: { progress: 4 } } } });
  const definitions = model.AchievementStore.getDefinitions();
  await model.AchievementStore.incrementProgress("p-a", "user", 99);
  assert.equal(model.AchievementStore.getPlayerState("p-a", "user").progress, 5);
  await model.AchievementStore.incrementProgress("p-a", "user", -99);
  assert.equal(model.AchievementStore.getPlayerState("p-a", "user").progress, 0);
  assert.equal(model.AchievementStore.getPlayerState("p-b", "other").progress, 4);
  assert.deepEqual(model.AchievementStore.getDefinitions(), definitions);
});

test("reorder uses stable IDs and preserves world state", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "id-a", name: "A" }, { id: "id-b", name: "B" }, { id: "id-c", name: "C" }]);
  await model.AchievementStore.saveState({ "id-a": { players: { u: { unlocked: true } } } });
  const state = model.AchievementStore.getState();
  await model.AchievementStore.reorder(["id-c", "id-a", "id-b"]);
  assert.deepEqual(model.AchievementStore.getDefinitions().map(item => item.id), ["id-c", "id-a", "id-b"]);
  assert.deepEqual(model.AchievementStore.getState(), state);
});

test("complete definition schema preserves secret through migration, create, update, and packs", async () => {
  values.set("achievementDefinitions", []); values.set("achievementState", {}); values.set("achievementSchemaVersion", 1);
  values.set("achievementdataNEW", JSON.stringify([{
    name: "Hidden Test", description: "Legacy", image: "test.webp", points: 5,
    glowing: true, color: "#ff0000", secret: true, progressRequired: 10,
    progressType: "counter", chainLength: 3, diceType: "d20", campaign: "Campaign",
    adventure: "Adventure", chapter: "1", players: ["user-1"], seenBy: ["user-1"],
    playerProgress: { "user-1": 7 }
  }]));
  await model.migrateAchievementSchema();
  const migrated = model.AchievementStore.getDefinitions()[0];
  assert.equal(migrated.secret, true);
  assert.deepEqual(model.AchievementStore.getPlayerState(migrated.id, "user-1"), {
    unlocked: true, seen: true, unlockedAt: null, progress: 7
  });

  const stateBefore = structuredClone(model.AchievementStore.getState());
  await model.AchievementStore.updateAchievement(migrated.id, { secret: false, players: ["intruder"], id: "changed" });
  assert.equal(model.AchievementStore.getDefinition(migrated.id).secret, false);
  assert.equal(model.AchievementStore.getDefinition("changed"), undefined);
  assert.deepEqual(model.AchievementStore.getState(), stateBefore);

  const source = { id: "roundtrip", name: "Boss #1: The End?", description: "All fields", image: "all.webp",
    points: 9, glowing: true, color: "#123456", secret: true,
    progress: { type: "diceChain", required: "20" }, chainLength: 4, diceType: "d20",
    campaign: "C", adventure: "A", chapter: "Ch" };
  const created = await model.AchievementStore.createAchievement(source);
  assert.deepEqual(created, source);
  await assert.rejects(model.AchievementStore.createAchievement(source), /Duplicate achievement ID/);
  const pack = model.exportAchievements();
  assert.equal(pack.state, undefined);
  await model.AchievementStore.saveDefinitions([]);
  await model.importAchievements(pack, { behavior: "overwrite" });
  assert.deepEqual(model.AchievementStore.getDefinition("roundtrip"), source);
});

test("duplicate names remain independent for update and delete by ID", async () => {
  await model.AchievementStore.saveDefinitions([{ id: "id-a", name: "Lucky" }, { id: "id-b", name: "Lucky" }]);
  await model.AchievementStore.saveState({ "id-a": { players: { u: { unlocked: true } } }, "id-b": { players: {} } });
  await model.AchievementStore.updateAchievement("id-b", { description: "only B" });
  assert.equal(model.AchievementStore.getDefinition("id-a").description, "");
  assert.equal(model.AchievementStore.getDefinition("id-b").description, "only B");
  assert.equal(await model.AchievementStore.deleteAchievement("id-a", { deleteState: true }), true);
  assert.equal(model.AchievementStore.getDefinition("id-a"), undefined);
  assert.equal(model.AchievementStore.getDefinition("id-b").name, "Lucky");
  assert.equal(model.AchievementStore.getState()["id-a"], undefined);
});
