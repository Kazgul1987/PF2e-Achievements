const MODULE_ID = "PF2e-Achievements";

/** New runtime protocol: structured, ordered IDs. */
export function createAchievementsGainedPayload(achievementIds, userId = undefined) {
  const payload = { type: "achievementsGained", achievementIds: [...achievementIds] };
  if (userId !== undefined) payload.userId = userId;
  return payload;
}

/**
 * Accept the structured protocol and old delimiter/name values at the boundary.
 * Every returned value is an ID; ambiguous legacy names are discarded.
 */
export function getAchievementIdsFromPayload(payload, store) {
  let references;
  if (payload?.type === "achievementsGained" && Array.isArray(payload.achievementIds)) references = payload.achievementIds;
  else if (Array.isArray(payload)) references = payload;
  else if (typeof payload === "string") references = payload.split("||||%%%||||").filter(Boolean);
  else return [];
  return references.map(reference => store.resolveAchievementId(reference)).filter(Boolean);
}

export async function consumeAchievementsGained(payload, store, callback) {
  const achievementIds = getAchievementIdsFromPayload(payload, store);
  for (const achievementId of achievementIds) await callback(achievementId);
  return achievementIds;
}

export function buildAchievementChatContent(achievement) {
  return '<p class="achGainedChatText">Achievement Gained:</p>'
    + `<div class="AchievementChatDisplay"><img class="chatAchImg" src="${achievement.image}"></img>`
    + `<b class="achNameChatP">${achievement.name}<b/> </div>`;
}

export function getRuntimeAchievement(achievementId, store, warn = console.warn, context = "display achievement") {
  const achievement = store?.getDefinition(achievementId);
  if (!achievement) warn(`${MODULE_ID} | Cannot ${context}; unknown achievement ID`, achievementId);
  return achievement ?? null;
}

export async function displayMyNewAchievementInChat(achievementId, {
  store = globalThis.window?.PF2eAchievements?.AchievementStore,
  chatMessage = globalThis.ChatMessage,
  enabled = true,
  warn = console.warn
} = {}) {
  if (!enabled) return false;
  const achievement = getRuntimeAchievement(achievementId, store, warn, "display achievement chat message");
  if (!achievement) return false;
  await chatMessage.create({ content: buildAchievementChatContent(achievement), blind: false });
  return true;
}
