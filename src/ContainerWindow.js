/**
 * RNK™ Vellum — ContainerWindow.js
 * ApplicationV2 sub-window that opens when a container item is double-clicked.
 * Mirrors the Cairn "open container → new inventory sheet" behavior.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { MODULE_ID } from './VellumDataModel.js';
import { UIManager }  from './UIManager.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ContainerWindow extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @param {Item} item  @param {Actor} actor  @param {string} registryKey */
  constructor(item, actor, registryKey) {
    super({ id: `rnk-vellum-container-${item.id}` });
    this._item        = item;
    this._actor       = actor;
    this._registryKey = registryKey;
  }

  // ─── ApplicationV2 Config ─────────────────────────────────────────────────

  static DEFAULT_OPTIONS = {
    classes:  ['rnk-vellum', 'container-window'],
    position: { width: 380, height: 480 },
    window:   { resizable: true }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/container-sheet.hbs` }
  };

  get title() {
    return `${this._item.name} — Contents`;
  }

  // ─── Context ──────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const capacity = this._item.getFlag(MODULE_ID, 'capacity') ?? 6;
    const raw      = this._item.getFlag(MODULE_ID, 'contents') ?? [];

    // Pad contents array to match capacity
    const contents = Array.from({ length: capacity }, (_, i) => ({
      index: i,
      label: raw[i]?.label ?? ''
    }));

    return {
      item:     this._item,
      capacity,
      contents,
      used:     raw.filter(c => c?.label?.trim()).length,
      moduleId: MODULE_ID
    };
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  _onRender(context, options) {
    this.element.querySelectorAll('.container-slot-input').forEach(el => {
      el.addEventListener('change', e => this._onSlotChange(e));
    });

    this.element.querySelector('.container-add-slot')
      ?.addEventListener('click', () => this._onAddSlot());
  }

  async _onSlotChange(event) {
    const idx      = parseInt(event.currentTarget.dataset.index);
    const value    = event.currentTarget.value.trim();
    const capacity = this._item.getFlag(MODULE_ID, 'capacity') ?? 6;
    const raw      = [...(this._item.getFlag(MODULE_ID, 'contents') ?? [])];

    // Ensure array is big enough
    while (raw.length <= idx) raw.push({ label: '' });
    raw[idx].label = value;

    await this._item.setFlag(MODULE_ID, 'contents', raw);
    await this._item.setFlag(
      MODULE_ID, 'used',
      raw.filter(c => c?.label?.trim()).length
    );
    this.render();
  }

  async _onAddSlot() {
    const current = this._item.getFlag(MODULE_ID, 'capacity') ?? 6;
    await this._item.setFlag(MODULE_ID, 'capacity', current + 1);
    this.render();
  }

  // ─── Close ────────────────────────────────────────────────────────────────

  async close(options = {}) {
    UIManager.deregister(this._registryKey);
    return super.close(options);
  }
}
