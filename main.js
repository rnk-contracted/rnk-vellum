/**
 * RNK Vellum - main.js
 * Bootstrap entry point.
 * Copyright 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { VellumActorSheet } from './src/VellumActorSheet.js';
import { VellumItemSheet } from './src/VellumItemSheet.js';
import { registerSettings, applyGlowVars } from './src/VellumSettings.js';

const MODULE_ID = 'rnk-vellum';

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('add', (a, b) => Number(a) + Number(b));
Handlebars.registerHelper('capitalize', (value) => {
  const s = value == null ? '' : String(value);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
});

function inferVellumCategory(item) {
  const t = (item.type ?? '').toLowerCase();
  const n = (item.name ?? '').toLowerCase();
  if (t === 'spell') return 'spell';
  if (t === 'weapon') return 'weapon';
  if (t === 'armor' || t === 'equipment') return 'armor';
  if (t === 'consumable' || t === 'potion' || t === 'scroll') return 'consumable';
  if (t === 'tool') return 'tool';
  if (t === 'shield') return 'shield';
  if (t === 'loot' || t === 'treasure') return 'misc';
  if (n.includes('armor') || n.includes('mail') || n.includes('plate') || n.includes('leather')) return 'armor';
  if (n.includes('shield')) return 'shield';
  if (n.includes('sword') || n.includes('axe') || n.includes('bow') ||
      n.includes('dagger') || n.includes('spear') || n.includes('mace') ||
      n.includes('club') || n.includes('staff') || n.includes('warhammer')) return 'weapon';
  if (n.includes('potion') || n.includes('scroll') || n.includes('ration') ||
      n.includes('torch') || n.includes('oil')) return 'consumable';
  return 'gear';
}

Hooks.once('init', () => {
  registerSettings();

  foundry.documents.collections.Actors.registerSheet(MODULE_ID, VellumActorSheet, {
    makeDefault: true,
    label: 'RNK Vellum'
  });

  foundry.documents.collections.Items.registerSheet(MODULE_ID, VellumItemSheet, {
    makeDefault: false,
    label: 'RNK Vellum Item'
  });
});

Hooks.once('ready', () => {
  applyGlowVars();
});

// Scene control button - GM only, opens the Vellum GM Hub
Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return;
  const tool = {
    name:    'rnk-vellum-hub',
    title:   'RNK Vellum - GM Hub',
    icon:    'fas fa-feather-alt',
    button:  true,
    toggle:  false,
    visible: true,
    onChange: async () => {
      const { VellumGMHub } = await import('./src/VellumGMHub.js');
      VellumGMHub.open();
    }
  };
  const control = {
    name:    MODULE_ID,
    title:   'RNK Vellum',
    icon:    'fas fa-feather-alt',
    order:   16,
    layer:   'token',
    visible: true,
    tools:   Array.isArray(controls) ? [tool] : { [tool.name]: tool }
  };
  if (Array.isArray(controls)) controls.push(control);
  else controls[MODULE_ID] = control;
});

Hooks.on('canvasReady', async () => {
  const { refreshAllTokens } = await import('./src/VellumTokenGlow.js');
  refreshAllTokens();
});

Hooks.on('refreshToken', async (token) => {
  const { refreshToken } = await import('./src/VellumTokenGlow.js');
  refreshToken(token);
});

Hooks.on('updateActor', async (actor) => {
  const { refreshActorTokens } = await import('./src/VellumTokenGlow.js');
  refreshActorTokens(actor);

  // Re-render any open Vellum sheet for this actor so AC and stats stay live.
  // Shadowdark derives AC from equipped armor + DEX, so the sheet must re-read
  // system values after every actor update rather than caching stale vellum data.
  for (const app of Object.values(actor.apps ?? {})) {
    if (app.constructor?.name === 'VellumActorSheet' && app.rendered) {
      app.render();
    }
  }
});

Hooks.on('preUpdateItem', (item) => {
  item._vellumPreviousContainerId = item.getFlag(MODULE_ID, 'containerId') ?? null;
});

Hooks.on('updateItem', async (item) => {
  const { UIManager } = await import('./src/UIManager.js');
  UIManager.refreshForItem(item, item._vellumPreviousContainerId ?? null);
  item._vellumPreviousContainerId = null;
});

Hooks.on('deleteItem', async (item) => {
  const { UIManager } = await import('./src/UIManager.js');
  UIManager.refreshForItem(item, item.getFlag(MODULE_ID, 'containerId') ?? null);
});

// When any item is created on an actor, auto-assign slot + category if missing
Hooks.on('createItem', async (item) => {
  const actor = item.parent;
  if (!actor || actor.documentName !== 'Actor') return;

  const updates = {};

  // Assign slot if missing
  if (item.getFlag(MODULE_ID, 'slot') == null) {
    const usedSlots = new Set(
      actor.items.contents
        .filter(it => it.id !== item.id)
        .map(it => it.getFlag(MODULE_ID, 'slot'))
        .filter(s => s != null)
    );
    let slot = 1;
    while (usedSlots.has(slot)) slot++;
    updates[`flags.${MODULE_ID}.slot`] = slot;
  }

  // Assign category if missing
  if (item.getFlag(MODULE_ID, 'category') == null) {
    updates[`flags.${MODULE_ID}.category`] = inferVellumCategory(item);
  }

  if (Object.keys(updates).length) {
    await item.update(updates);
  }
});
