/**
 * RNK™ Vellum — VellumGMHub.js
 * GM-only hub for managing per-actor Vellum settings from the scene controls.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { MODULE_ID } from './VellumDataModel.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Per-actor overrideable settings stored as actor flags
const ACTOR_SETTING_DEFAULTS = {
  glowColor:     '#c8a020',
  glowBlur:      10,
  glowSpread:    4,
  blessingColor: '#c8a020',
  tokenGlow:     false
};

/** Apply CSS vars only to open Vellum sheets for a given actor. */
function applyActorSheetVars(actorId, mutator) {
  document.querySelectorAll(`.rnk-vellum[data-actor-id="${actorId}"]`).forEach(mutator);
}

export class VellumGMHub extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id:       'rnk-vellum-gm-hub',
    classes:  ['rnk-vellum', 'vellum-settings-window', 'vellum-gm-hub'],
    position: { width: 460, height: 'auto' },
    window:   { resizable: true, title: 'RNK™ Vellum — GM Hub' }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/gm-hub.hbs` }
  };

  // Track expanded state per actor across renders
  _expanded = new Set();

  async _prepareContext(options) {
    // Find all actors whose sheet is set to the Vellum sheet
    const vellumActors = game.actors.contents.filter(a => {
      const sheetClass = a._sheet?.constructor?.name ?? '';
      const flagSheet  = a.getFlag('core', 'sheetClass') ?? '';
      return sheetClass === 'VellumActorSheet' || flagSheet.includes('VellumActorSheet');
    });

    const actors = vellumActors.map(actor => {
      const flags = actor.getFlag(MODULE_ID, 'actorSettings') ?? {};
      return {
        id:           actor.id,
        name:         actor.name,
        img:          actor.img || 'icons/svg/mystery-man.svg',
        expanded:     this._expanded.has(actor.id),
        glowColor:     flags.glowColor     ?? ACTOR_SETTING_DEFAULTS.glowColor,
        glowBlur:      flags.glowBlur      ?? ACTOR_SETTING_DEFAULTS.glowBlur,
        glowSpread:    flags.glowSpread    ?? ACTOR_SETTING_DEFAULTS.glowSpread,
        blessingColor: flags.blessingColor ?? ACTOR_SETTING_DEFAULTS.blessingColor,
        blessingCount: flags.blessingCount ?? (game.settings.get(MODULE_ID, 'blessingCount') ?? 3),
        tokenGlow:     actor.getFlag(MODULE_ID, 'tokenGlow') ?? false
      };
    });

    return { actors, hasActors: actors.length > 0 };
  }

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    const el = this.element;

    // Per-actor blessing count picker
    el.querySelectorAll('.vhub-actor-card').forEach(card => {
      const actorId = card.dataset.actorId;
      const actor   = game.actors.get(actorId);
      if (!actor) return;
      card.querySelectorAll('.vhub-blessing-count-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const flags = {
            ...(actor.getFlag(MODULE_ID, 'actorSettings') ?? {}),
            blessingCount: parseInt(btn.dataset.count, 10)
          };
          await actor.setFlag(MODULE_ID, 'actorSettings', flags);
          this.render();
        });
      });
    });

    // Expand/collapse cards
    el.querySelectorAll('.vhub-actor-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // don't toggle when clicking buttons
        const id = header.closest('.vhub-actor-card').dataset.actorId;
        if (this._expanded.has(id)) this._expanded.delete(id);
        else this._expanded.add(id);
        this.render();
      });
    });

    // Per-actor setting inputs — save to actor flag on change
    el.querySelectorAll('.vhub-actor-card').forEach(card => {
      const actorId = card.dataset.actorId;
      const actor   = game.actors.get(actorId);
      if (!actor) return;

      const save = async () => {
        const prev = actor.getFlag(MODULE_ID, 'actorSettings') ?? {};
        const flags = {
          ...prev,
          glowColor:     card.querySelector('[name="glowColor"]')?.value     ?? ACTOR_SETTING_DEFAULTS.glowColor,
          glowBlur:      parseInt(card.querySelector('[name="glowBlur"]')?.value ?? ACTOR_SETTING_DEFAULTS.glowBlur, 10),
          glowSpread:    parseInt(card.querySelector('[name="glowSpread"]')?.value ?? ACTOR_SETTING_DEFAULTS.glowSpread, 10),
          blessingColor: card.querySelector('[name="blessingColor"]')?.value ?? ACTOR_SETTING_DEFAULTS.blessingColor
        };
        await actor.setFlag(MODULE_ID, 'actorSettings', flags);
        applyActorSheetVars(actorId, sheetEl => {
          sheetEl.style.setProperty('--vellum-glow-color',  flags.glowColor);
          sheetEl.style.setProperty('--vellum-glow-blur',   `${flags.glowBlur}px`);
          sheetEl.style.setProperty('--vellum-glow-spread', `${flags.glowSpread}px`);
          sheetEl.style.setProperty('--vellum-blessing-on', flags.blessingColor);
        });
      };

      // Live preview for sliders
      const blurInput    = card.querySelector('[name="glowBlur"]');
      const spreadInput  = card.querySelector('[name="glowSpread"]');
      if (blurInput)   blurInput.addEventListener('input',   () => { card.querySelector('.vhub-blur-val').textContent   = `${blurInput.value}px`; });
      if (spreadInput) spreadInput.addEventListener('input', () => { card.querySelector('.vhub-spread-val').textContent = `${spreadInput.value}px`; });

      card.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', save);
      });

      // Token glow toggle
      card.querySelector('.vhub-token-glow-btn')?.addEventListener('click', async () => {
        const current = actor.getFlag(MODULE_ID, 'tokenGlow') ?? false;
        const next = !current;
        await actor.setFlag(MODULE_ID, 'tokenGlow', next);
        const { refreshActorTokens } = await import('./VellumTokenGlow.js');
        refreshActorTokens(actor);
        applyActorSheetVars(actorId, sheetEl => {
          const glowValue = next
            ? 'drop-shadow(0 0 var(--vellum-glow-blur) var(--vellum-glow-color)) drop-shadow(0 0 var(--vellum-glow-spread) var(--vellum-glow-color))'
            : 'none';
          const glowHoverValue = next
            ? 'drop-shadow(0 0 calc(var(--vellum-glow-blur) * 1.6) var(--vellum-glow-color)) drop-shadow(0 0 calc(var(--vellum-glow-spread) * 1.6) var(--vellum-glow-color))'
            : 'none';
          sheetEl.style.setProperty('--vellum-portrait-glow', glowValue);
          sheetEl.style.setProperty('--vellum-portrait-glow-hover', glowHoverValue);
        });
        this.render();
      });

      // Open sheet
      card.querySelector('.vhub-open-sheet-btn')?.addEventListener('click', () => {
        actor.sheet.render(true);
      });

      // Reset to global defaults
      card.querySelector('.vhub-reset-btn')?.addEventListener('click', async () => {
        await actor.unsetFlag(MODULE_ID, 'actorSettings');
        this.render();
      });
    });
  }

  static open() {
    // ApplicationV2 instances live in foundry.applications.instances (not ui.windows)
    const instances = foundry.applications?.instances;
    if (instances) {
      for (const app of instances.values()) {
        if (app?.id === 'rnk-vellum-gm-hub') {
          if (app.rendered) {
            app.bringToFront?.();
            return app;
          }
        }
      }
    }
    const hub = new VellumGMHub();
    hub.render(true);
    return hub;
  }
}
