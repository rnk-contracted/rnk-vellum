/**
 * RNK™ Vellum — VellumDataModel.js
 * Schema definition and flag-based data accessors for actor vellum data.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

export const MODULE_ID = 'rnk-vellum';

/** Categories that are weightless — excluded from inventory slot count. */
export const WEIGHTLESS_CATEGORIES = new Set(['spell', 'ability']);

/** Categories that show a roll button in the inventory row. */
export const ROLLABLE_CATEGORIES = new Set(['weapon', 'spell', 'ability']);

export const VELLUM_DEFAULTS = {
  className:          '',
  level:              1,
  xp:                 0,
  description:        '',
  subtitle:           '',
  animalDeityPortrait:'',
  hp:   { value: 0,  max: 0   },
  ac:   10,
  str:  { score: 10 },
  dex:  { score: 10 },
  con:  { score: 10 },
  int:  { score: 10 },
  wis:  { score: 10 },
  cha:  { score: 10 },
  gp:   { value: 0,  max: 200 },
  blessings: { b1: true, b2: true, b3: true },
  traits:   '',
  flaws:    '',
  phobia:   '',
  effects:  ''
};

/**
 * Returns a merged copy of defaults + saved flag data for the given actor,
 * bridging HP, AC, and stat scores FROM actor.system when those paths exist.
 * System values are authoritative so changes on the default sheet appear here.
 * @param {Actor} actor
 * @returns {Object}
 */
export function getVellumData(actor) {
  const saved  = actor.getFlag(MODULE_ID, 'data') ?? {};
  const merged = foundry.utils.mergeObject(
    foundry.utils.deepClone(VELLUM_DEFAULTS),
    saved,
    { inplace: false }
  );

  // Bridge HP from system
  if (actor.system?.attributes?.hp !== undefined) {
    merged.hp.value = actor.system.attributes.hp.value ?? merged.hp.value;
    merged.hp.max   = actor.system.attributes.hp.max   ?? merged.hp.max;
  }

  // Bridge AC from system — handle both object and scalar forms
  if (actor.system?.attributes?.ac !== undefined) {
    const sysAc = typeof actor.system.attributes.ac === 'object'
      ? (actor.system.attributes.ac.value ?? actor.system.attributes.ac.flat)
      : actor.system.attributes.ac;
    if (sysAc != null) merged.ac = sysAc;
  }

  // Bridge stat scores from system
  if (actor.system?.abilities !== undefined) {
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const sysScore = actor.system.abilities[key]?.value;
      if (sysScore != null) merged[key] = { score: sysScore };
    }
  }

  return merged;
}

/**
 * Merges updates into the actor's vellum flag data, persists, then syncs
 * HP, AC, and stat scores back to actor.system.* so the game system sees them.
 * @param {Actor} actor
 * @param {Object} updates  Flat or nested update object
 * @returns {Promise}
 */
export async function setVellumData(actor, updates) {
  const current  = getVellumData(actor);
  const expanded = foundry.utils.expandObject(updates);
  const merged   = foundry.utils.mergeObject(current, expanded, { inplace: false });
  await actor.setFlag(MODULE_ID, 'data', merged);
  await _syncSystemFields(actor, merged);
}

/**
 * Writes HP, AC, and stat scores to actor.system.* when the system exposes
 * those paths — keeps vellum changes visible to native system mechanics.
 * @param {Actor} actor
 * @param {Object} vellumData
 */
async function _syncSystemFields(actor, vellumData) {
  const updates = {};

  // HP
  if (actor.system?.attributes?.hp !== undefined) {
    updates['system.attributes.hp.value'] = vellumData.hp?.value ?? 0;
    updates['system.attributes.hp.max']   = vellumData.hp?.max   ?? 0;
  }

  // AC — handle both object and scalar
  if (actor.system?.attributes?.ac !== undefined) {
    const acVal = parseInt(vellumData.ac) || 10;
    if (typeof actor.system.attributes.ac === 'object') {
      updates['system.attributes.ac.value'] = acVal;
    } else {
      updates['system.attributes.ac'] = acVal;
    }
  }

  // Stat scores
  if (actor.system?.abilities !== undefined) {
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      if (actor.system.abilities[key] !== undefined) {
        updates[`system.abilities.${key}.value`] = vellumData[key]?.score ?? 10;
      }
    }
  }

  if (Object.keys(updates).length) await actor.update(updates);
}

/**
 * Builds a processed stat array for template rendering.
 * Modifier is always auto-computed: floor((score - 10) / 2).
 * @param {Object} vellum
 * @param {string[]} keys
 * @returns {Array}
 */
export function buildStats(vellum, keys) {
  return keys.map(key => {
    const score = vellum[key]?.score ?? 10;
    const mod   = Math.floor((score - 10) / 2);
    return {
      key,
      label:      key.toUpperCase(),
      score,
      mod,
      modDisplay: mod >= 0 ? `+${mod}` : String(mod),
      scoreField: `${key}.score`
    };
  });
}
