/**
 * RNK™ Vellum — VellumItemSheet.js
 * ApplicationV2 item sheet for Vellum items: standard, container, and notepad types.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { MODULE_ID } from './VellumDataModel.js';

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class VellumItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ['rnk-vellum', 'sheet', 'item'],
    position: { width: 420, height: 320 },
    window:   { resizable: true },
    form:     { submitOnChange: false, closeOnSubmit: false }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/item-sheet.hbs` }
  };

  get title() {
    return this.item.name ?? 'Item';
  }

  // ─── Context ──────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const type = this.item.getFlag(MODULE_ID, 'type') ?? 'standard';
    return {
      item:           this.item,
      vellumType:     type,
      isContainer:    type === 'container',
      isNotepad:      type === 'notepad',
      vellumSlot:     this.item.getFlag(MODULE_ID, 'slot')       ?? '',
      vellumCapacity: this.item.getFlag(MODULE_ID, 'capacity')   ?? 3,
      vellumUsed:     this.item.getFlag(MODULE_ID, 'used')       ?? 0,
      vellumNotes:    this.item.getFlag(MODULE_ID, 'notes')      ?? '',
      vellumDamage:   this.item.getFlag(MODULE_ID, 'damage')     ?? '',
      vellumWeight:   this.item.getFlag(MODULE_ID, 'weight')     ?? '',
      vellumCategory: this.item.getFlag(MODULE_ID, 'category')   ?? 'gear',
      vellumEquipped: this.item.getFlag(MODULE_ID, 'equipped')   ?? false,
      categories:     ['gear', 'weapon', 'armor', 'shield', 'consumable', 'tool', 'spell', 'ability', 'misc'],
      types:          ['standard', 'container', 'notepad'],
      moduleId:       MODULE_ID
    };
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  _onRender(context, options) {
    if (!this.isEditable) return;

    this.element.querySelectorAll('[data-item-flag]').forEach(el => {
      el.addEventListener('change', e => this._onFlagChange(e));
    });

    this.element.querySelector('.vellum-item-type-select')
      ?.addEventListener('change', e => this._onTypeChange(e));
  }

  async _onFlagChange(event) {
    const el  = event.currentTarget;
    const key = el.dataset.itemFlag;
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.type === 'number') value = Number(el.value);
    else value = el.value;
    return this.item.setFlag(MODULE_ID, key, value);
  }

  async _onTypeChange(event) {
    const type = event.currentTarget.value;
    await this.item.setFlag(MODULE_ID, 'type', type);
    this.render();
  }
}
