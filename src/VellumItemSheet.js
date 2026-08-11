/**
 * RNK™ Vellum — VellumItemSheet.js
 * ApplicationV2 item sheet for Vellum items: standard, container, and notepad types.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import {
  MODULE_ID, resolveItemType, getContainerCapacity, defaultContainerCapacity
} from './VellumDataModel.js';
import { UIManager } from './UIManager.js';

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/** Normalize system description (string or { value }) to a plain string. */
function readItemDescription(item) {
  const d = item?.system?.description;
  if (d == null) return item?.getFlag?.(MODULE_ID, 'description') ?? '';
  if (typeof d === 'string') return d;
  if (typeof d === 'object') return d.value ?? d.content ?? '';
  return String(d);
}

/** Persist description using the shape the system expects. */
async function writeItemDescription(item, value) {
  const d = item?.system?.description;
  if (d != null && typeof d === 'object') {
    return item.update({ 'system.description.value': value });
  }
  if (item?.system && 'description' in (item.system ?? {})) {
    return item.update({ 'system.description': value });
  }
  return item.setFlag(MODULE_ID, 'description', value);
}

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
    const type = resolveItemType(this.item);
    return {
      item:           this.item,
      vellumType:     type,
      isContainer:    type === 'container',
      isNotepad:      type === 'notepad',
      vellumSlot:     this.item.getFlag(MODULE_ID, 'slot')       ?? '',
      vellumCapacity: getContainerCapacity(this.item),
      vellumUsed:     this.item.getFlag(MODULE_ID, 'used')       ?? 0,
      vellumNotes:    this.item.getFlag(MODULE_ID, 'notes')      ?? '',
      vellumDamage:   this.item.getFlag(MODULE_ID, 'damage')     ?? '',
      vellumWeight:   this.item.getFlag(MODULE_ID, 'weight')     ?? '',
      vellumCategory: this.item.getFlag(MODULE_ID, 'category')   ?? 'gear',
      vellumEquipped: this.item.getFlag(MODULE_ID, 'equipped')   ?? false,
      itemDescription: readItemDescription(this.item),
      categories:     ['gear', 'weapon', 'armor', 'shield', 'consumable', 'tool', 'spell', 'ability', 'misc'],
      types:          ['standard', 'container', 'notepad'],
      moduleId:       MODULE_ID
    };
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    if (!this.isEditable) return;

    this.element.querySelectorAll('[data-item-flag]').forEach(el => {
      el.addEventListener('change', e => this._onFlagChange(e));
    });

    this.element.querySelector('.vellum-item-type-select')
      ?.addEventListener('change', e => this._onTypeChange(e));

    this.element.querySelector('.vellum-item-name-input')
      ?.addEventListener('change', e => this._onNameChange(e));

    this.element.querySelector('.vellum-item-desc')
      ?.addEventListener('change', e => this._onDescriptionChange(e));

    this.element.querySelector('.vellum-item-sheet-img')
      ?.addEventListener('click', e => this._onImageClick(e));
  }

  async _onFlagChange(event) {
    const el  = event.currentTarget;
    const key = el.dataset.itemFlag;
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.type === 'number') {
      value = Number(el.value);
      if (key === 'capacity') {
        value = Number.isFinite(value) ? Math.max(1, Math.min(30, Math.floor(value))) : 6;
      }
    }
    else value = el.value;
    await this.item.setFlag(MODULE_ID, key, value);
    if (key === 'capacity') {
      UIManager.refreshContainer(this.item.id);
      this.render(true);
    }
  }

  async _onNameChange(event) {
    const name = event.currentTarget.value?.trim();
    if (!name) return;
    return this.item.update({ name });
  }

  async _onDescriptionChange(event) {
    return writeItemDescription(this.item, event.currentTarget.value ?? '');
  }

  _onImageClick(event) {
    event.preventDefault();
    const FP = foundry.applications.apps.FilePicker.implementation;
    new FP({
      type:    'image',
      current: this.item.img ?? '',
      callback: path => this.item.update({ img: path })
    }).browse();
  }

  async _onTypeChange(event) {
    const type = event.currentTarget.value;
    const updates = { [`flags.${MODULE_ID}.type`]: type };
    // When promoting to container, persist a real capacity so inventory tags
    // and the container window share the same value (and the user can edit it).
    if (type === 'container' && this.item.getFlag(MODULE_ID, 'capacity') == null) {
      updates[`flags.${MODULE_ID}.capacity`] = defaultContainerCapacity(this.item);
    }
    await this.item.update(updates);
    // Re-render this settings sheet so Capacity appears/disappears, then open
    // the container/notepad window if applicable.
    await this.render({ force: true });
    if (type === 'container' && this.item.parent) {
      return UIManager.openContainer(this.item, this.item.parent);
    }
    if (type === 'notepad' && this.item.parent) {
      return UIManager.openNotepad(this.item, this.item.parent);
    }
  }
}
