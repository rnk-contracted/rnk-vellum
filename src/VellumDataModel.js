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

/**
 * Names that should open as Vellum containers (Shadowdark backpacks, sacks, etc.).
 * Matched against the item name (case-insensitive whole words / common phrases).
 */
const CONTAINER_NAME_RE = /\b(backpack|rucksack|knapsack|haversack|satchel|saddlebag|bandolier|quiver|chest|trunk|crate|barrel|cask|pouch|sack|scroll\s*case)\b|\bbag\b/i;

/**
 * Default internal capacity (slots items can hold) by container name.
 * Shadowdark's backpack is flavor-only in the system; Vellum supplies a capacity.
 * @param {Item|string} itemOrName
 * @returns {number}
 */
export function defaultContainerCapacity(itemOrName) {
  const n = String(itemOrName?.name ?? itemOrName ?? '').toLowerCase();
  if (/\b(backpack|rucksack|knapsack|haversack)\b/.test(n)) return 10;
  if (/\b(chest|trunk|crate)\b/.test(n)) return 12;
  if (/\b(barrel|cask)\b/.test(n)) return 8;
  if (/\b(sack|satchel|saddlebag)\b/.test(n)) return 6;
  if (/\b(pouch|quiver|bandolier|scroll\s*case)\b/.test(n)) return 3;
  if (/\bbag\b/.test(n)) return 6;
  return 6;
}

/**
 * Resolved container capacity: saved flag if valid, otherwise name-based default.
 * @param {Item} item
 * @returns {number}
 */
export function getContainerCapacity(item) {
  const raw = item?.getFlag?.(MODULE_ID, 'capacity');
  const n = Number(raw);
  if (raw != null && Number.isFinite(n) && n >= 1) return Math.min(30, Math.floor(n));
  return defaultContainerCapacity(item);
}

/**
 * Resolve Vellum item type: standard | container | notepad.
 * Prefers an explicit flag; otherwise infers containers from name
 * (e.g. Shadowdark "Backpack") so compendium gear works without re-tagging.
 * @param {Item} item
 * @returns {'standard'|'container'|'notepad'}
 */
export function resolveItemType(item) {
  const flagged = item?.getFlag?.(MODULE_ID, 'type');
  if (flagged === 'container' || flagged === 'notepad' || flagged === 'standard') {
    return flagged;
  }

  const name = String(item?.name ?? '');
  if (CONTAINER_NAME_RE.test(name)) return 'container';

  // Icon path hint used by many Foundry container assets
  const img = String(item?.img ?? '').toLowerCase();
  if (img.includes('/bags/') || img.includes('/containers/bags/')) return 'container';

  return 'standard';
}

/**
 * Whether this item is a Vellum container (flag or inferred).
 * @param {Item} item
 * @returns {boolean}
 */
export function isVellumContainer(item) {
  return resolveItemType(item) === 'container';
}

/**
 * Ensure a container has an explicit type flag + capacity saved so future
 * opens and tags stay stable. No-op for non-containers.
 * @param {Item} item
 * @returns {Promise<void>}
 */
export async function ensureContainerFlags(item) {
  if (!item || resolveItemType(item) !== 'container') return;
  const updates = {};
  if (item.getFlag(MODULE_ID, 'type') !== 'container') {
    updates[`flags.${MODULE_ID}.type`] = 'container';
  }
  if (item.getFlag(MODULE_ID, 'capacity') == null) {
    updates[`flags.${MODULE_ID}.capacity`] = defaultContainerCapacity(item);
  }
  if (Object.keys(updates).length) await item.update(updates);
}

/**
 * Resolve the Vellum inventory category for an item.
 * Prefers an explicit flag; otherwise infers from system type / flags / name
 * so weapons and spells stay rollable without manual re-tagging.
 * @param {Item} item
 * @returns {string}
 */
export function resolveItemCategory(item) {
  const flagged = item?.getFlag?.(MODULE_ID, 'category');
  if (flagged && flagged !== 'gear') return flagged;

  const t = String(item?.type ?? '').toLowerCase();
  const n = String(item?.name ?? '').toLowerCase();
  const sys = item?.system ?? {};

  if (sys.isSpell || t === 'spell') return 'spell';
  if (sys.isAbility || t === 'ability' || t === 'feature' || t === 'talent') return 'ability';
  if (sys.isWeapon || t === 'weapon') return 'weapon';
  if (t === 'armor' || t === 'equipment') return 'armor';
  if (t === 'shield') return 'shield';
  if (t === 'consumable' || t === 'potion' || t === 'scroll') return 'consumable';
  if (t === 'tool') return 'tool';
  if (t === 'loot' || t === 'treasure') return 'misc';

  if (n.includes('armor') || n.includes('mail') || n.includes('plate') || n.includes('leather')) return 'armor';
  if (n.includes('shield')) return 'shield';
  if (n.includes('sword') || n.includes('axe') || n.includes('bow') ||
      n.includes('dagger') || n.includes('spear') || n.includes('mace') ||
      n.includes('club') || n.includes('staff') || n.includes('warhammer')) return 'weapon';
  if (n.includes('potion') || n.includes('scroll') || n.includes('ration') ||
      n.includes('torch') || n.includes('oil')) return 'consumable';

  // Explicit gear flag, or nothing matched
  return flagged || 'gear';
}

/**
 * Whether the item should show a roll / attack control on the sheet.
 * @param {Item} item
 * @param {string} [category]  Pre-resolved category (optional)
 * @returns {boolean}
 */
export function isItemRollable(item, category) {
  const cat = category ?? resolveItemCategory(item);
  if (ROLLABLE_CATEGORIES.has(cat)) return true;

  const sys = item?.system ?? {};
  if (sys.isWeapon || sys.isSpell || sys.isAbility) return true;

  const t = String(item?.type ?? '').toLowerCase();
  if (t === 'weapon' || t === 'spell' || t === 'ability') return true;

  const flagDamage = item?.getFlag?.(MODULE_ID, 'damage') ?? '';
  const hasFormula = !!(flagDamage
    || sys.damage?.formula
    || sys.damage?.parts?.length
    || sys.damage?.oneHanded
    || sys.damage?.twoHanded
    || sys.formula);
  return hasFormula;
}

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

  // HP current and max both persist as plain fields in Shadowdark (unlike AC
  // below, the system never recomputes hp.max on its own), so both sync back —
  // otherwise an edited max reverts to the stale system value on the next
  // render, since getVellumData's bridge always prefers the system value.
  if (actor.system?.attributes?.hp !== undefined) {
    updates['system.attributes.hp.value'] = vellumData.hp?.value ?? 0;
    updates['system.attributes.hp.max']   = vellumData.hp?.max   ?? 0;
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
  // Shadowdark backpacks use slots_used: 0 (free to carry). Do not coerce 0 → 1.
  const perSlot   = Number(slots.per_slot);
  const slotsUsed = Number(slots.slots_used);
  const quantity  = Number(item.system?.quantity);
  const per      = Number.isFinite(perSlot) && perSlot > 0 ? perSlot : 1;
  const used     = Number.isFinite(slotsUsed) && slotsUsed >= 0 ? slotsUsed : 1;
  const qty      = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const cost     = Math.ceil(qty / per) * used;
  if (!Number.isFinite(cost) || cost < 0) return 1;
  return cost;
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
  const typeSlug = String(item?.type ?? '').toLowerCase();
  // Shadowdark sets isWeapon; other systems may only use type === 'weapon'
  if (!sys?.isWeapon && typeSlug !== 'weapon' && !sys?.damage) return '';

  const dieKey = typeof sys.getDamageFormula === 'function'
    ? sys.getDamageFormula()
    : (sys.damage?.oneHanded || sys.damage?.twoHanded || sys.damage?.formula || '');
  if (!dieKey) return '';
  const dmg = (typeof CONFIG !== 'undefined' && CONFIG.SHADOWDARK?.WEAPON_BASE_DAMAGE?.[dieKey])
    ? CONFIG.SHADOWDARK.WEAPON_BASE_DAMAGE[dieKey]
    : dieKey;

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
