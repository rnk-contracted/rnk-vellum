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

/** Item flag used when an item is stored inside a container. */
export const CONTAINER_ID_FLAG = 'containerId';

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

  // HP current value only — max is derived by Shadowdark from CON + level/class
  // and is overwritten on every actor update, so we never write it back.
  if (actor.system?.attributes?.hp !== undefined) {
    updates['system.attributes.hp.value'] = vellumData.hp?.value ?? 0;
  }

  // AC is a derived/computed value in Shadowdark (armor + DEX mod) — do not write
  // back to system.attributes.ac as the system recalculates and overwrites it.
  // The sheet always reads AC from the system via getVellumData's bridge above.

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
 * Number of inventory slots an item occupies. Reads Shadowdark's own
 * "Slots per item" field (system.slots.slots_used, scaled by quantity vs.
 * per_slot) when present; defaults to 1 slot for other systems / item types.
 * @param {Item} item
 * @returns {number}
 */
export function itemSlotCost(item) {
  const slots = item?.system?.slots;
  if (!slots) return 1;
  const perSlot    = Number(slots.per_slot) || 1;
  const slotsUsed  = Number(slots.slots_used) || 1;
  const quantity   = Number(item.system?.quantity) || 1;
  const cost = Math.ceil(quantity / perSlot) * slotsUsed;
  return Number.isFinite(cost) && cost > 0 ? cost : 1;
}

/**
 * Weapon damage die + best-fit ability modifier, e.g. "1d4 +2".
 * Shadowdark-only (reads system.damage / system.isWeapon); returns '' for
 * items the current game system doesn't model this way.
 * @param {Item} item
 * @param {Object} vellum  Result of getVellumData(actor)
 * @returns {string}
 */
export function weaponStatTag(item, vellum) {
  const sys = item?.system;
  if (!sys?.isWeapon) return '';

  const dieKey = typeof sys.getDamageFormula === 'function'
    ? sys.getDamageFormula()
    : (sys.damage?.oneHanded || sys.damage?.twoHanded || '');
  if (!dieKey) return '';
  const dmg = CONFIG.SHADOWDARK?.WEAPON_BASE_DAMAGE?.[dieKey] ?? dieKey;

  const isRanged  = sys.type === 'ranged';
  const isFinesse = typeof sys.hasProperty === 'function' && sys.hasProperty('finesse');
  const strScore  = vellum?.str?.score ?? 10;
  const dexScore  = vellum?.dex?.score ?? 10;
  const abilScore = isRanged ? dexScore : (isFinesse ? Math.max(strScore, dexScore) : strScore);
  const mod = Math.floor((abilScore - 10) / 2);

  return mod !== 0 ? `${dmg} ${mod > 0 ? '+' : ''}${mod}` : dmg;
}

/**
 * Armor Class contribution, e.g. "AC 11 + DEX" for body armor or "+2 AC"
 * for a shield. Shadowdark-only (reads system.ac); returns '' otherwise.
 * @param {Item} item
 * @returns {string}
 */
export function armorStatTag(item) {
  const ac = item?.system?.ac;
  if (!ac) return '';
  const base = ac.base ?? 0;
  const mod  = ac.modifier ?? 0;
  const attr = ac.attribute ?? '';

  if (base) {
    let s = `AC ${base}`;
    if (attr) s += ` + ${attr.toUpperCase()}`;
    if (mod)  s += ` ${mod > 0 ? '+' : ''}${mod}`;
    return s;
  }
  if (mod) return `${mod > 0 ? '+' : ''}${mod} AC`;
  return '';
}

/**
 * Spell save DC, e.g. "DC 13". Shadowdark-only (reads system.dc);
 * returns '' otherwise.
 * @param {Item} item
 * @returns {string}
 */
export function spellStatTag(item) {
  const dc = item?.system?.dc;
  return dc != null ? `DC ${dc}` : '';
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
