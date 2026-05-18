/**
 * RNK™ Vellum — NotepadWindow.js
 * ApplicationV2 sub-window that opens when a Notepad item is double-clicked.
 * Stores and retrieves notes from the item's flags.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { MODULE_ID } from './VellumDataModel.js';
import { UIManager }  from './UIManager.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class NotepadWindow extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @param {Item} item  @param {Actor} actor  @param {string} registryKey */
  constructor(item, actor, registryKey) {
    super({ id: `rnk-vellum-notepad-${item.id}` });
    this._item        = item;
    this._actor       = actor;
    this._registryKey = registryKey;
  }

  // ─── ApplicationV2 Config ─────────────────────────────────────────────────

  static DEFAULT_OPTIONS = {
    classes:  ['rnk-vellum', 'notepad-window'],
    position: { width: 460, height: 500 },
    window:   { resizable: true }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/notepad-window.hbs` }
  };

  get title() {
    return `${this._item.name} — Notes`;
  }

  // ─── Context ──────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    return {
      item:     this._item,
      notes:    this._item.getFlag(MODULE_ID, 'notes') ?? '',
      moduleId: MODULE_ID
    };
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  _onRender(context, options) {
    const textarea = this.element.querySelector('.notepad-body');
    if (!textarea) return;

    // Debounced auto-save on input
    let _timer = null;
    textarea.addEventListener('input', e => {
      clearTimeout(_timer);
      _timer = setTimeout(() => this._saveNotes(e.currentTarget.value), 600);
    });

    // Immediate save on blur
    textarea.addEventListener('blur', e => {
      clearTimeout(_timer);
      this._saveNotes(e.currentTarget.value);
    });
  }

  async _saveNotes(value) {
    return this._item.setFlag(MODULE_ID, 'notes', value);
  }

  // ─── Close ────────────────────────────────────────────────────────────────

  async close(options = {}) {
    UIManager.deregister(this._registryKey);
    return super.close(options);
  }
}
