const MODULE_ID = "PF2e-Achievements";
const SETTINGS_NAMESPACE = "farchievements";
const SCHEMA_VERSION = 2;
const PACK_FORMAT = "pf2e-achievements";
const CURRENT_PACK_VERSION = 1;

const clone = value => foundry.utils.deepClone(value);
const randomID = () => foundry.utils.randomID();

function legacyUserIds(achievement = {}) {
  return new Set([
    ...(Array.isArray(achievement.players) ? achievement.players : []),
    ...(Array.isArray(achievement.seenBy) ? achievement.seenBy : []),
    ...Object.keys(achievement.playerDates ?? {}),
    ...Object.keys(achievement.playerProgress ?? {})
  ].filter(id => typeof id === "string" && id.length));
}

function toDefinition(achievement = {}, id = achievement.id ?? randomID()) {
  return {
    id,
    name: achievement.name ?? "",
    description: achievement.description ?? "",
    image: achievement.image ?? "",
    points: achievement.points ?? 1,
    glowing: achievement.glowing ?? false,
    color: achievement.color ?? "",
    secret: Boolean(achievement.secret),
    progress: {
      type: achievement.progress?.type ?? achievement.progressType ?? "standard",
      required: achievement.progress?.required ?? achievement.progressRequired ?? 0
    },
    chainLength: achievement.chainLength ?? null,
    diceType: achievement.diceType ?? null,
    campaign: achievement.campaign ?? "",
    adventure: achievement.adventure ?? "",
    chapter: achievement.chapter ?? ""
  };
}

function toState(achievement = {}) {
  const unlocked = new Set(Array.isArray(achievement.players) ? achievement.players : []);
  const seen = new Set(Array.isArray(achievement.seenBy) ? achievement.seenBy : []);
  const players = {};
  for (const userId of legacyUserIds(achievement)) {
    players[userId] = {
      unlocked: unlocked.has(userId),
      seen: seen.has(userId),
      unlockedAt: achievement.playerDates?.[userId] ?? null,
      progress: achievement.playerProgress?.[userId] ?? 0
    };
  }
  return { players };
}

function definitionSignature(achievement = {}) {
  const definition = toDefinition(achievement, "signature");
  delete definition.id;
  return JSON.stringify(definition);
}

function rollMatches(condition, value) {
  if (typeof condition !== "string" && typeof condition !== "number") return false;
  const text = String(condition).trim();
  const target = Number.parseInt(text.replace(/^[<>]/, "").trim(), 10);
  if (!Number.isFinite(target)) return false;
  if (text.startsWith("<")) return value < target;
  if (text.startsWith(">")) return value > target;
  return value === target;
}

export function validateMigration(legacy, definitions, state) {
  const fail = detail => { throw new Error(`Achievement migration validation failed: ${detail}`); };
  if (!Array.isArray(legacy) || !Array.isArray(definitions) || legacy.length !== definitions.length) fail("achievement count differs");
  const ids = new Set();
  legacy.forEach((old, index) => {
    const definition = definitions[index];
    if (!definition?.id || ids.has(definition.id)) fail(`missing or duplicate id at ${index}`);
    ids.add(definition.id);
    if (definition.name !== (old.name ?? "")) fail(`name differs at ${index}`);
    if (definition.points !== (old.points ?? 1)) fail(`points differ at ${index}`);
    if (definition.secret !== Boolean(old.secret)) fail(`secret differs at ${index}`);
    if (definition.progress?.type !== (old.progress?.type ?? old.progressType ?? "standard")) fail(`progress type differs at ${index}`);
    if (definition.progress?.required !== (old.progress?.required ?? old.progressRequired ?? 0)) fail(`required progress differs at ${index}`);
    const playerState = state?.[definition.id]?.players ?? {};
    const users = legacyUserIds(old);
    if (Object.keys(playerState).length !== users.size) fail(`user count differs at ${index}`);
    for (const userId of users) {
      const next = playerState[userId];
      if (!next) fail(`user ${userId} missing at ${index}`);
      if ((old.players ?? []).includes(userId) && next.unlocked !== true) fail(`unlock missing at ${index}`);
      if ((old.seenBy ?? []).includes(userId) && next.seen !== true) fail(`seen status missing at ${index}`);
      if (Object.hasOwn(old.playerDates ?? {}, userId) && next.unlockedAt !== old.playerDates[userId]) fail(`date differs at ${index}`);
      if (Object.hasOwn(old.playerProgress ?? {}, userId) && next.progress !== old.playerProgress[userId]) fail(`progress differs at ${index}`);
    }
  });
  return true;
}

export class AchievementStore {
  static _writeQueue = Promise.resolve();
  static _enqueue(operation) {
    const result = this._writeQueue.then(operation, operation);
    this._writeQueue = result.catch(() => {});
    return result;
  }
  static getDefinitions() { return clone(game.settings.get(SETTINGS_NAMESPACE, "achievementDefinitions") ?? []); }
  static getDefinition(id) { return this.getDefinitions().find(item => item.id === id); }
  static getState() { return clone(game.settings.get(SETTINGS_NAMESPACE, "achievementState") ?? {}); }
  static getAchievementState(id) { return this.getState()[id] ?? { players: {} }; }
  static getPlayerState(id, userId) { return this.getAchievementState(id).players?.[userId] ?? { unlocked: false, seen: false, unlockedAt: null, progress: 0 }; }
  static async saveDefinitions(value) {
    const definitions = value.map(item => toDefinition(item, item.id ?? randomID()));
    if (new Set(definitions.map(item => item.id)).size !== definitions.length) throw new Error("Achievement IDs must be unique");
    await game.settings.set(SETTINGS_NAMESPACE, "achievementDefinitions", definitions);
    return definitions;
  }
  static async saveState(value) { await game.settings.set(SETTINGS_NAMESPACE, "achievementState", clone(value)); return value; }
  static async createAchievement(data = {}) {
    const definitions = this.getDefinitions();
    const id = data.id ?? randomID();
    if (typeof id !== "string" || !id.trim()) throw new TypeError("Achievement ID must be a non-empty string");
    if (definitions.some(item => item.id === id)) throw new Error(`Duplicate achievement ID: ${id}`);
    const item = toDefinition(data, id);
    await this.saveDefinitions([...definitions, item]);
    return item;
  }
  static async updateAchievement(id, changes) {
    const definitions = this.getDefinitions();
    const index = definitions.findIndex(item => item.id === id);
    if (index < 0) throw new Error(`Unknown achievement ${id}`);
    definitions[index] = toDefinition(foundry.utils.mergeObject(definitions[index], changes, { inplace: false }), id);
    await this.saveDefinitions(definitions); return definitions[index];
  }
  static async deleteAchievement(id, { deleteState = true } = {}) {
    const definitions = this.getDefinitions();
    if (!definitions.some(item => item.id === id)) return false;
    await this.saveDefinitions(definitions.filter(item => item.id !== id));
    if (deleteState) { const state = this.getState(); delete state[id]; await this.saveState(state); }
    return true;
  }
  static async resetAll() {
    await this.saveDefinitions([]);
    await this.saveState({});
    await game.settings.set(SETTINGS_NAMESPACE, "achievementSchemaVersion", SCHEMA_VERSION);
  }
  static async _changePlayer(id, userId, changes) {
    return this._enqueue(async () => {
      if (typeof id !== "string" || typeof userId !== "string" || !id || !userId) throw new TypeError("Achievement ID and user ID must be non-empty strings");
      if (!this.getDefinition(id)) throw new Error(`Unknown achievement ${id}`);
      const state = this.getState();
      state[id] ??= { players: {} }; state[id].players ??= {};
      const current = state[id].players[userId] ?? { unlocked: false, seen: false, unlockedAt: null, progress: 0 };
      state[id].players[userId] = { ...current, ...(typeof changes === "function" ? changes(current) : changes) };
      await this.saveState(state); return state[id].players[userId];
    });
  }
  static unlock(id, userId) {
    return this._changePlayer(id, userId, current => ({ unlocked: true, unlockedAt: current.unlocked ? current.unlockedAt ?? Date.now() : Date.now() }));
  }
  // Locking is deliberately lossless: progress, seen, and unknown extension
  // fields survive; only the unlock and its timestamp are cleared.
  static lock(id, userId) { return this._changePlayer(id, userId, { unlocked: false, unlockedAt: null }); }
  static setSeen(id, userId, seen = true) { return this._changePlayer(id, userId, { seen: Boolean(seen) }); }
  static setProgress(id, userId, progress) {
    const definition = this.getDefinition(id);
    if (!definition) return Promise.reject(new Error(`Unknown achievement ${id}`));
    const maximum = Number(definition.progress?.required);
    const requested = Math.max(0, Number(progress) || 0);
    return this._changePlayer(id, userId, { progress: maximum > 0 ? Math.min(requested, maximum) : requested });
  }
  static incrementProgress(id, userId, amount = 1) {
    const definition = this.getDefinition(id);
    if (!definition) return Promise.reject(new Error(`Unknown achievement ${id}`));
    const maximum = Number(definition.progress?.required);
    return this._changePlayer(id, userId, current => {
      const progress = Math.max(0, (Number(current.progress) || 0) + (Number(amount) || 0));
      return { progress: maximum > 0 ? Math.min(progress, maximum) : progress };
    });
  }
  static async reorder(orderedIds) {
    const definitions = this.getDefinitions();
    const byId = new Map(definitions.map(definition => [definition.id, definition]));
    if (!Array.isArray(orderedIds) || orderedIds.length !== definitions.length ||
        new Set(orderedIds).size !== definitions.length || orderedIds.some(id => !byId.has(id))) {
      throw new Error("Achievement reorder must contain every achievement ID exactly once");
    }
    return this.saveDefinitions(orderedIds.map(id => byId.get(id)));
  }
  static async unlockMany(id, userIds) {
    const uniqueIds = [...new Set(userIds)].filter(userId => typeof userId === "string" && userId.length);
    for (const userId of uniqueIds) await this.unlock(id, userId);
    return uniqueIds.length;
  }
  static processDiceRoll({ formula = "", total, natural } = {}, userId) {
    return this._enqueue(async () => {
      const definitions = this.getDefinitions();
      const state = this.getState();
      const unlocked = [];
      for (const definition of definitions) {
        if (!["dice", "diceChain"].includes(definition.progress.type) || !String(formula).includes(definition.diceType)) continue;
        state[definition.id] ??= { players: {} }; state[definition.id].players ??= {};
        const current = state[definition.id].players[userId] ?? { unlocked: false, seen: false, unlockedAt: null, progress: 0 };
        if (current.unlocked) continue;
        const rolledValue = Number.isFinite(natural) ? natural : total;
        const success = rollMatches(definition.progress.required, rolledValue);
        if (definition.progress.type === "dice" && success) {
          state[definition.id].players[userId] = { ...current, unlocked: true, unlockedAt: Date.now() };
          unlocked.push(definition.id);
        } else if (definition.progress.type === "diceChain") {
          const progress = success ? (Number(current.progress) || 0) + 1 : 0;
          const required = Number(definition.chainLength) || Number(definition.progress.required) || 1;
          const complete = progress >= required;
          state[definition.id].players[userId] = { ...current, progress: complete ? required : progress,
            unlocked: complete, unlockedAt: complete ? Date.now() : current.unlockedAt };
          if (complete) unlocked.push(definition.id);
        }
      }
      await this.saveState(state);
      return { unlocked };
    });
  }
  static getLegacyView() {
    const state = this.getState();
    return this.getDefinitions().map(definition => {
      const players = state[definition.id]?.players ?? {}; const playerDates = {}; const playerProgress = {};
      for (const [userId, value] of Object.entries(players)) {
        if (value.unlockedAt != null) playerDates[userId] = value.unlockedAt;
        if (value.progress !== undefined) playerProgress[userId] = value.progress;
      }
      return { ...clone(definition), progressRequired: definition.progress.required, progressType: definition.progress.type,
        players: Object.keys(players).filter(id => players[id].unlocked), seenBy: Object.keys(players).filter(id => players[id].seen), playerDates, playerProgress };
    });
  }
  /**
   * @deprecated Legacy compatibility bridge.
   * Do not use for new runtime mutations. Use AchievementStore
   * create/update/delete/state APIs instead.
   */
  static async saveLegacyView(achievements) {
    const oldState = this.getState(); const oldDefinitions = this.getDefinitions(); const definitions = []; const state = {};
    const idsBySignature = new Map();
    for (const definition of oldDefinitions) {
      const signature = definitionSignature(definition);
      const matches = idsBySignature.get(signature) ?? [];
      matches.push(definition.id); idsBySignature.set(signature, matches);
    }
    const usedIds = new Set();
    for (const achievement of achievements) {
      let id = achievement.id;
      if (!id) {
        const candidates = (idsBySignature.get(definitionSignature(achievement)) ?? []).filter(candidate => !usedIds.has(candidate));
        if (candidates.length === 1) id = candidates[0];
        else {
          id = randomID();
          console.warn(`${MODULE_ID} | Could not safely resolve legacy achievement ID; generated a new ID`, achievement);
        }
      }
      if (usedIds.has(id)) throw new Error(`Duplicate achievement ID in legacy view: ${id}`);
      usedIds.add(id); definitions.push(toDefinition(achievement, id));
      state[id] = toState(achievement);
      for (const [userId, value] of Object.entries(oldState[id]?.players ?? {})) state[id].players[userId] ??= value;
    }
    await this.saveDefinitions(definitions); await this.saveState(state);
  }
}

export class AchievementImporter {
  static parse(raw) {
    let data = typeof raw === "string" ? JSON.parse(raw) : clone(raw);
    // Legacy array entries without IDs cannot reliably be matched across repeated
    // imports and are therefore treated as new achievements.
    if (Array.isArray(data)) data = { format: PACK_FORMAT, version: 0, meta: { migratedFrom: "legacy-array" }, achievements: data };
    if (!data || typeof data !== "object") throw new Error("Invalid achievement import");
    return data;
  }
  static detectVersion(pack) { return Number(pack.version ?? 0); }
  static validateEnvelope(pack) {
    if (!pack || typeof pack !== "object" || Array.isArray(pack)) throw new Error("Invalid achievement import");
    if (pack.format !== undefined && pack.format !== PACK_FORMAT) throw new Error(`Unsupported achievement pack format: ${pack.format}`);
    if (!Array.isArray(pack.achievements)) throw new Error("Achievement pack has no achievements array");
    return true;
  }
  static assertSupportedVersion(version) {
    if (!Number.isInteger(version) || version < 0 || version > CURRENT_PACK_VERSION) throw new Error(`Unsupported achievement pack version ${version}`);
  }
  static migrate(pack, options = {}) {
    if (!Array.isArray(pack.achievements)) throw new Error("Achievement pack has no achievements array");
    const worldBackup = options.worldBackup === true || pack.meta?.type === "world-backup";
    const achievements = pack.achievements.map(item => toDefinition(item, item.id ?? randomID()));
    const state = {};
    if (worldBackup) pack.achievements.forEach((item, index) => { state[achievements[index].id] = pack.state?.[achievements[index].id] ?? toState(item); });
    return { format: PACK_FORMAT, version: 1, meta: clone(pack.meta ?? {}), achievements, state, worldBackup };
  }
  static validate(pack) {
    if (pack.format !== PACK_FORMAT || !Array.isArray(pack.achievements)) throw new Error("Invalid PF2e Achievements pack");
    const ids = pack.achievements.map(item => item.id);
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error("Achievement pack IDs are missing or duplicated");
    return true;
  }
  static async merge(pack, options = {}) {
    const behavior = options.behavior ?? "skip";
    if (!["skip", "update", "duplicate", "overwrite"].includes(behavior)) throw new Error(`Unknown merge behavior ${behavior}`);
    if (behavior === "overwrite") {
      await AchievementStore.saveDefinitions(pack.achievements);
      // Definition-only packs must never replace or prune world state. Only an
      // explicitly requested world backup is allowed to restore runtime data.
      if (pack.worldBackup) await AchievementStore.saveState(clone(pack.state ?? {}));
      return { imported: pack.achievements.length, skipped: 0 };
    }
    const definitions = AchievementStore.getDefinitions(); const byId = new Map(definitions.map((item, index) => [item.id, index]));
    const importedIds = [];
    for (const source of pack.achievements) {
      let item = clone(source); const index = byId.get(item.id);
      if (index !== undefined && behavior === "skip") continue;
      if (index !== undefined && behavior === "update") definitions[index] = item;
      else { if (index !== undefined) item.id = randomID(); byId.set(item.id, definitions.length); definitions.push(item); }
      importedIds.push([source.id, item.id]);
    }
    await AchievementStore.saveDefinitions(definitions);
    if (pack.worldBackup) {
      const state = AchievementStore.getState();
      for (const [sourceId, targetId] of importedIds) if (pack.state[sourceId]) state[targetId] = clone(pack.state[sourceId]);
      await AchievementStore.saveState(state);
    }
    return { imported: importedIds.length, skipped: pack.achievements.length - importedIds.length };
  }
}

export async function importAchievements(raw, options = {}) {
  const parsed = AchievementImporter.parse(raw);
  AchievementImporter.validateEnvelope(parsed);
  const version = AchievementImporter.detectVersion(parsed);
  AchievementImporter.assertSupportedVersion(version);
  const migrated = AchievementImporter.migrate(parsed, options); AchievementImporter.validate(migrated);
  return AchievementImporter.merge(migrated, options);
}

export function exportAchievements({ worldBackup = false, name = "Achievement Pack" } = {}) {
  const pack = { format: PACK_FORMAT, version: 1, meta: { name, exportedAt: new Date().toISOString(), moduleVersion: game.modules.get(MODULE_ID)?.version ?? "" }, achievements: AchievementStore.getDefinitions() };
  if (worldBackup) { pack.meta.type = "world-backup"; pack.state = AchievementStore.getState(); }
  return pack;
}

export async function migrateAchievementSchema() {
  if (!game.user?.isGM || game.settings.get(SETTINGS_NAMESPACE, "achievementSchemaVersion") >= SCHEMA_VERSION) return false;
  const raw = game.settings.get(SETTINGS_NAMESPACE, "achievementdataNEW");
  const delimiter = game.settings.get(SETTINGS_NAMESPACE, "achievementdata");
  if ((!raw || raw === "[]") && typeof delimiter === "string" && delimiter.trim()) throw new Error("Legacy achievement migration did not produce valid JSON data.");
  let legacy;
  try { legacy = raw ? JSON.parse(raw) : []; } catch (error) { throw new Error("Legacy achievementdataNEW is invalid JSON", { cause: error }); }
  if (!Array.isArray(legacy)) throw new Error("Legacy achievementdataNEW is not an array");
  const previousDefinitions = AchievementStore.getDefinitions(); const previousState = AchievementStore.getState();

  // A prior attempt may have completed both copy-on-write settings but failed
  // before advancing the version. Validate that exact result rather than
  // replacing it or generating another set of IDs.
  if (previousDefinitions.length || Object.keys(previousState).length) {
    validateMigration(legacy, previousDefinitions, previousState);
    await game.settings.set(SETTINGS_NAMESPACE, "achievementSchemaVersion", SCHEMA_VERSION);
    console.log(`${MODULE_ID} | Schema v2 migration completed`);
    return true;
  }
  const definitions = []; const state = {};
  legacy.forEach((achievement, index) => {
    const id = achievement.id ?? randomID();
    definitions.push(toDefinition(achievement, id)); state[id] = toState(achievement);
  });
  validateMigration(legacy, definitions, state);
  try {
    await AchievementStore.saveDefinitions(definitions); await AchievementStore.saveState(state);
    validateMigration(legacy, AchievementStore.getDefinitions(), AchievementStore.getState());
    await game.settings.set(SETTINGS_NAMESPACE, "achievementSchemaVersion", SCHEMA_VERSION);
    console.log(`${MODULE_ID} | Schema v2 migration completed`);
    return true;
  } catch (error) {
    try { await game.settings.set(SETTINGS_NAMESPACE, "achievementDefinitions", previousDefinitions); await game.settings.set(SETTINGS_NAMESPACE, "achievementState", previousState); } catch (rollbackError) { console.error(`${MODULE_ID} | Achievement migration rollback failed`, rollbackError); }
    throw error;
  }
}

export async function migrateDelimiterDataToLegacyJson() {
  const existing = game.settings.get(SETTINGS_NAMESPACE, "achievementdataNEW");
  if (existing) return false;
  const raw = game.settings.get(SETTINGS_NAMESPACE, "achievementdata");
  if (typeof raw !== "string" || !raw.trim()) return false;
  console.log(`${MODULE_ID} | Starting legacy achievement migration`);
  const clientRows = String(game.settings.get(SETTINGS_NAMESPACE, "clientdataSYNC") ?? "").split("||").filter(Boolean);
  const unlocks = new Map(clientRows.map(row => { const [userId, ids = ""] = row.split(":"); return [userId, new Set(ids.split(",").filter(Boolean))]; }));
  const legacy = raw.split(";;;").filter(Boolean).map((row, index) => {
    const [heading = "", image = "", description = ""] = row.split("////");
    const separator = heading.indexOf(":::");
    const legacyId = separator >= 0 ? heading.slice(0, separator) : String(index + 1);
    const name = separator >= 0 ? heading.slice(separator + 3) : heading;
    const ids = new Set([String(index), legacyId]);
    const players = [...unlocks].filter(([, values]) => [...ids].some(id => values.has(id))).map(([userId]) => userId);
    return { name, image, description, points: 1, players, seenBy: [], playerDates: {}, playerProgress: {}, progressRequired: 0, progressType: "standard" };
  });
  await game.settings.set(SETTINGS_NAMESPACE, "achievementdataNEW", JSON.stringify(legacy));
  const persisted = game.settings.get(SETTINGS_NAMESPACE, "achievementdataNEW");
  let parsed;
  try { parsed = JSON.parse(persisted); } catch { parsed = null; }
  if (!Array.isArray(parsed) || parsed.length !== legacy.length) throw new Error("Legacy achievement migration did not produce valid JSON data.");
  console.log(`${MODULE_ID} | Legacy JSON migration completed`);
  return true;
}

export async function migrateAchievements() {
  try {
    await migrateDelimiterDataToLegacyJson();
    return await migrateAchievementSchema();
  } catch (error) {
    console.error(`${MODULE_ID} | Achievement migration failed`, error);
    throw error;
  }
}

export async function migrateLegacySeenFlags(users = game.users?.contents ?? []) {
  const definitions = AchievementStore.getDefinitions();
  for (const user of users) {
    const names = await user.getFlag?.(MODULE_ID, "seenAchievements");
    if (!Array.isArray(names)) continue;
    for (const name of names) {
      const matches = definitions.filter(item => item.name === name);
      if (matches.length === 1) await AchievementStore.setSeen(matches[0].id, user.id, true);
      else if (matches.length > 1) console.warn(`${MODULE_ID} | Cannot migrate ambiguous seen achievement name: ${name}`);
    }
  }
}

Hooks.once("init", () => {
  game.settings.register(SETTINGS_NAMESPACE, "achievementDefinitions", { scope: "world", config: false, type: Array, default: [] });
  game.settings.register(SETTINGS_NAMESPACE, "achievementState", { scope: "world", config: false, type: Object, default: {} });
  game.settings.register(SETTINGS_NAMESPACE, "achievementSchemaVersion", { scope: "world", config: false, type: Number, default: 1 });
  window.PF2eAchievements = { AchievementStore, AchievementImporter, importAchievements, exportAchievements, migrateAchievementSchema, migrateDelimiterDataToLegacyJson, migrateAchievements, migrateLegacySeenFlags, validateMigration };
});
