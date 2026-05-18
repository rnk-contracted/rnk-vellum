/**
 * RNK™ Vellum — VellumDataModel.js
 * Schema definition and flag-based data accessors for actor vellum data.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

export const MODULE_ID = 'rnk-vellum';

export const VELLUM_DEFAULTS = {
  className:          '',
  level:              1,
  xp:                 0,
  description:        '',
  subtitle:           '',
  animalDeityPortrait:'',
  hp:   { value: 0,  max: 0   },
  ac:   10,
  str:  { score: 10, mod: 0   },
  dex:  { score: 10, mod: 0   },
  con:  { score: 10, mod: 0   },
  int:  { score: 10, mod: 0   },
  wis:  { score: 10, mod: 0   },
  cha:  { score: 10, mod: 0   },
  gp:   { value: 0,  max: 200 },
  blessings: { b1: true, b2: true, b3: true },
  traits:   '',
  flaws:    '',
  phobia:   '',
  effects:  '',
  abilities: []
};

/**
 * Returns a merged copy of defaults + saved flag data for the given actor.
 * @param {Actor} actor
 * @returns {Object}
 */
export function getVellumData(actor) {
  const saved = actor.getFlag(MODULE_ID, 'data') ?? {};
  return foundry.utils.mergeObject(
    foundry.utils.deepClone(VELLUM_DEFAULTS),
    saved,
    { inplace: false }
  );
}

/**
 * Merges updates into the actor's vellum flag data and persists.
 * Supports dot-notation keys e.g. { 'hp.value': 5 }.
 * @param {Actor} actor
 * @param {Object} updates  Flat or nested update object
 * @returns {Promise}
 */
export async function setVellumData(actor, updates) {
  const current = getVellumData(actor);
  const expanded = foundry.utils.expandObject(updates);
  const merged   = foundry.utils.mergeObject(current, expanded, { inplace: false });
  return actor.setFlag(MODULE_ID, 'data', merged);
}

/**
 * Builds a processed stat array for template rendering.
 * @param {Object} vellum
 * @param {string[]} keys
 * @returns {Array}
 */
export function buildStats(vellum, keys) {
  return keys.map(key => ({
    key,
    label:      key.toUpperCase(),
    score:      vellum[key]?.score ?? 10,
    mod:        vellum[key]?.mod   ?? 0,
    scoreField: `${key}.score`,
    modField:   `${key}.mod`
  }));
}
