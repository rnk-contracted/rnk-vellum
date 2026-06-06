/**
 * RNK™ Vellum — VellumSettings.js
 * Module setting registration and the settings dialog (ApplicationV2).
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { MODULE_ID } from './VellumDataModel.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const DEFAULTS = {
  glowColor:     '#c8a020',
  glowBlur:      10,
  glowSpread:    4,
  blessingColor: '#c8a020',
  blessingCount: 3
};

export function registerSettings() {
  game.settings.register(MODULE_ID, 'glowColor', {
    name:    'Glow Color',
    scope:   'client',
    config:  false,
    type:    String,
    default: DEFAULTS.glowColor
  });
  game.settings.register(MODULE_ID, 'glowBlur', {
    name:    'Glow Blur Radius',
    scope:   'client',
    config:  false,
    type:    Number,
    default: DEFAULTS.glowBlur
  });
  game.settings.register(MODULE_ID, 'glowSpread', {
    name:    'Glow Spread',
    scope:   'client',
    config:  false,
    type:    Number,
    default: DEFAULTS.glowSpread
  });
  game.settings.register(MODULE_ID, 'blessingColor', {
    name:    'Blessing Token Color',
    scope:   'client',
    config:  false,
    type:    String,
    default: DEFAULTS.blessingColor
  });
  game.settings.register(MODULE_ID, 'blessingCount', {
    name:    'Number of Blessing Tokens',
    scope:   'world',
    config:  false,
    type:    Number,
    default: DEFAULTS.blessingCount
  });
}

/** Read saved settings and inject them as CSS vars on all .rnk-vellum elements. */
export async function applyGlowVars() {
  const hasGlowColor    = game.settings.settings.has(`${MODULE_ID}.glowColor`);
  const hasGlowBlur     = game.settings.settings.has(`${MODULE_ID}.glowBlur`);
  const hasGlowSpread   = game.settings.settings.has(`${MODULE_ID}.glowSpread`);
  const hasBlessingColor = game.settings.settings.has(`${MODULE_ID}.blessingColor`);

  const color    = hasGlowColor ? game.settings.get(MODULE_ID, 'glowColor') : DEFAULTS.glowColor;
  const blur     = hasGlowBlur ? game.settings.get(MODULE_ID, 'glowBlur') : DEFAULTS.glowBlur;
  const spread   = hasGlowSpread ? game.settings.get(MODULE_ID, 'glowSpread') : DEFAULTS.glowSpread;
  const blessing = hasBlessingColor ? game.settings.get(MODULE_ID, 'blessingColor') : DEFAULTS.blessingColor;

  // Write to root so newly-opened sheets inherit immediately
  document.documentElement.style.setProperty('--vellum-glow-color',   color);
  document.documentElement.style.setProperty('--vellum-glow-blur',    `${blur}px`);
  document.documentElement.style.setProperty('--vellum-glow-spread',  `${spread}px`);
  document.documentElement.style.setProperty('--vellum-blessing-on',  blessing);

  // Also update any already-open sheets directly
  document.querySelectorAll('.rnk-vellum').forEach(el => {
    el.style.setProperty('--vellum-glow-color',  color);
    el.style.setProperty('--vellum-glow-blur',   `${blur}px`);
    el.style.setProperty('--vellum-glow-spread', `${spread}px`);
    el.style.setProperty('--vellum-blessing-on', blessing);
  });

  // Re-apply PIXI glows on tokens with glow enabled so color/blur updates live
  const { reapplyAllGlows } = await import('./VellumTokenGlow.js');
  reapplyAllGlows();
}

export class VellumSettingsApp extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id:       'rnk-vellum-settings',
    classes:  ['rnk-vellum', 'vellum-settings-window'],
    position: { width: 380, height: 'auto' },
    window:   { resizable: false, title: 'RNK™ Vellum — Settings' }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/settings.hbs` }
  };

  async _prepareContext(options) {
    return {
      glowColor:     game.settings.get(MODULE_ID, 'glowColor'),
      glowBlur:      game.settings.get(MODULE_ID, 'glowBlur'),
      glowSpread:    game.settings.get(MODULE_ID, 'glowSpread'),
      blessingColor: game.settings.get(MODULE_ID, 'blessingColor'),
      blessingCount: game.settings.get(MODULE_ID, 'blessingCount')
    };
  }

  _onRender(context, options) {
    const el = this.element;

    // Live preview as sliders / color move
    const colorInput     = el.querySelector('#vellum-glow-color');
    const blurInput      = el.querySelector('#vellum-glow-blur');
    const spreadInput    = el.querySelector('#vellum-glow-spread');
    const blessingInput  = el.querySelector('#vellum-blessing-color');
    const blessingCount  = el.querySelector('#vellum-blessing-count');
    const preview        = el.querySelector('#vellum-glow-preview');
    const blessingPrev   = el.querySelector('#vellum-blessing-preview');

    const updatePreview = () => {
      const c = colorInput.value;
      const b = blurInput.value;
      const s = spreadInput.value;
      el.querySelector('[name="glowBlur"] + .vellum-settings-value').textContent   = `${b}px`;
      el.querySelector('[name="glowSpread"] + .vellum-settings-value').textContent = `${s}px`;
      el.querySelector('[name="glowColor"] + .vellum-settings-value').textContent  = c;
      preview.style.filter = `drop-shadow(0 0 ${b}px ${c}) drop-shadow(0 0 ${s}px ${c})`;
      if (blessingPrev) blessingPrev.style.background = blessingInput.value;
    };

    colorInput.addEventListener('input',    updatePreview);
    blurInput.addEventListener('input',     updatePreview);
    spreadInput.addEventListener('input',   updatePreview);
    blessingInput?.addEventListener('input', updatePreview);
    updatePreview();

    // Blessing count picker — highlight selected, write to hidden input
    el.querySelectorAll('.vellum-blessing-count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.vellum-blessing-count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        blessingCount.value = btn.dataset.count;
      });
    });

    // Save
    el.querySelector('[data-action="save"]').addEventListener('click', async () => {
      await game.settings.set(MODULE_ID, 'glowColor',     colorInput.value);
      await game.settings.set(MODULE_ID, 'glowBlur',      parseInt(blurInput.value));
      await game.settings.set(MODULE_ID, 'glowSpread',    parseInt(spreadInput.value));
      await game.settings.set(MODULE_ID, 'blessingColor', blessingInput.value);
      await game.settings.set(MODULE_ID, 'blessingCount', parseInt(blessingCount.value));
      applyGlowVars();
      ui.notifications.info('RNK™ Vellum: Settings saved.');
      this.close();
    });

    // Reset
    el.querySelector('[data-action="reset"]').addEventListener('click', async () => {
      await game.settings.set(MODULE_ID, 'glowColor',     DEFAULTS.glowColor);
      await game.settings.set(MODULE_ID, 'glowBlur',      DEFAULTS.glowBlur);
      await game.settings.set(MODULE_ID, 'glowSpread',    DEFAULTS.glowSpread);
      await game.settings.set(MODULE_ID, 'blessingColor', DEFAULTS.blessingColor);
      await game.settings.set(MODULE_ID, 'blessingCount', DEFAULTS.blessingCount);
      applyGlowVars();
      this.render();
    });
  }
}
