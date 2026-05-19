/**
 * RNK™ Vellum — main.js
 * Bootstrap entry point.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

const MODULE_ID = 'rnk-vellum';

Handlebars.registerHelper('eq', (a, b) => a === b);

Hooks.once('init', async () => {
  const [
    { VellumActorSheet },
    { VellumItemSheet },
    { registerSettings }
  ] = await Promise.all([
    import('./src/VellumActorSheet.js'),
    import('./src/VellumItemSheet.js'),
    import('./src/VellumSettings.js')
  ]);

  registerSettings();

  foundry.documents.collections.Actors.registerSheet(MODULE_ID, VellumActorSheet, {
    makeDefault: true,
    label: 'RNK™ Vellum'
  });

  foundry.documents.collections.Items.registerSheet(MODULE_ID, VellumItemSheet, {
    makeDefault: false,
    label: 'RNK™ Vellum Item'
  });

});

Hooks.once('ready', async () => {
  const { applyGlowVars } = await import('./src/VellumSettings.js');
  applyGlowVars();
});

// Scene control button — GM only, opens the Vellum GM Hub
Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return;
  const tool = {
    name:    'rnk-vellum-hub',
    title:   'RNK™ Vellum — GM Hub',
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
    title:   'RNK™ Vellum',
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
    const t = (item.type ?? '').toLowerCase();
    const n = (item.name ?? '').toLowerCase();
    let category = 'gear';
    if (t === 'weapon')                                           category = 'weapon';
    else if (t === 'armor' || t === 'equipment')                  category = 'armor';
    else if (t === 'consumable' || t === 'potion' || t === 'scroll') category = 'consumable';
    else if (t === 'tool')                                        category = 'tool';
    else if (t === 'shield')                                      category = 'shield';
    else if (t === 'loot' || t === 'treasure')                    category = 'misc';
    else if (n.includes('armor') || n.includes('mail') || n.includes('plate') || n.includes('leather')) category = 'armor';
    else if (n.includes('shield'))                                category = 'shield';
    else if (n.includes('sword') || n.includes('axe') || n.includes('bow') ||
             n.includes('dagger') || n.includes('spear') || n.includes('mace') ||
             n.includes('club') || n.includes('staff') || n.includes('warhammer')) category = 'weapon';
    else if (n.includes('potion') || n.includes('scroll') || n.includes('ration') ||
             n.includes('torch') || n.includes('oil'))            category = 'consumable';
    updates[`flags.${MODULE_ID}.category`] = category;
  }

  if (Object.keys(updates).length) {
    await item.update(updates);
  }
});

