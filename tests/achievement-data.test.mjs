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
