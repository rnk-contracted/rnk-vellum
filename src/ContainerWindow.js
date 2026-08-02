/**
 * RNK™ Vellum — ContainerWindow.js
 * ApplicationV2 sub-window that opens when a container item is double-clicked.
 * Mirrors the Cairn "open container → new inventory sheet" behavior.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { MODULE_ID, CONTAINER_ID_FLAG, itemSlotCost } from './VellumDataModel.js';
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
    const entries  = this._getContentEntries();
    const total     = Math.max(capacity, entries.length);
    const slots     = Array.from({ length: total }, (_, i) => {
      const entry = entries[i] ?? null;
      const itemId = entry?.itemId ?? ContainerWindow._entryItemId(entry);
      const item   = itemId ? this._actor.items.get(itemId) : null;
      const slotCost = item ? itemSlotCost(item) : 1;
      return {
        index:    i,
        itemId:   item?.id ?? entry?.itemId ?? '',
        itemUuid: item?.uuid ?? entry?.itemUuid ?? '',
        itemName: item?.name ?? entry?.label ?? '',
        itemImg:  item?.img ?? '',
        label:    entry?.label ?? '',
        isLegacy: !!entry?.label && !item,
        hasItem:  !!item,
        slotCost,
        showSlotCost: slotCost > 1
      };
    });
    const used = entries.reduce((sum, entry) => {
      const itemId = entry?.itemId ?? ContainerWindow._entryItemId(entry);
      const item = itemId ? this._actor.items.get(itemId) : null;
      return sum + (item ? itemSlotCost(item) : 1);
    }, 0);

    return {
      item:     this._item,
      capacity,
      slots,
      used,
      overCapacity: used > capacity,
      moduleId: MODULE_ID
    };
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  _onRender(context, options) {
    this.element.querySelectorAll('.vellum-container-slot').forEach(el => {
      el.addEventListener('dragover', e => this._onSlotDragOver(e));
      el.addEventListener('drop', e => this._onSlotDrop(e));
    });

    this.element.querySelectorAll('.vellum-container-item').forEach(el => {
      el.addEventListener('dragstart', e => this._onItemDragStart(e));
    });

    this.element.querySelector('.container-add-slot')
      ?.addEventListener('click', () => this._onAddSlot());

    this.element.querySelectorAll('.vellum-container-remove').forEach(el => {
      el.addEventListener('click', e => this._onRemoveItem(e));
    });

    this.element.querySelectorAll('.vellum-container-item-name').forEach(el => {
      el.addEventListener('click', e => this._onItemClick(e));
    });
  }

  static _normalizeEntry(entry) {
    if (entry == null) return null;
    if (typeof entry === 'string') {
      const label = entry.trim();
      return label ? { label } : null;
    }
    if (typeof entry !== 'object') return null;

    const itemId   = String(entry.itemId ?? entry.id ?? '').trim();
    const itemUuid = String(entry.itemUuid ?? entry.uuid ?? '').trim();
    const label    = String(entry.label ?? '').trim();
    if (!itemId && !itemUuid && !label) return null;

    const normalized = {};
    if (itemId) normalized.itemId = itemId;
    if (itemUuid) normalized.itemUuid = itemUuid;
    if (label) normalized.label = label;
    return normalized;
  }

  _getContentEntries() {
    const raw = Array.isArray(this._item.getFlag(MODULE_ID, 'contents'))
      ? this._item.getFlag(MODULE_ID, 'contents')
      : [];

    // Container membership lives on the contained item. Reconcile the saved
    // ordering against those flags so legacy labels, deleted-item references,
    // and stale duplicate records never consume capacity.
    const entries = [];
    const seen = new Set();

    for (const rawEntry of raw) {
      const entry = ContainerWindow._normalizeEntry(rawEntry);
      const itemId = ContainerWindow._entryItemId(entry);
      const item = itemId ? this._actor.items.get(itemId) : null;
      if (!item || item.id === this._item.id || seen.has(item.id)) continue;
      if (item.getFlag(MODULE_ID, CONTAINER_ID_FLAG) !== this._item.id) continue;
      entries.push({ itemId: item.id, itemUuid: item.uuid });
      seen.add(item.id);
    }

    for (const item of this._actor.items.contents) {
      if (item.getFlag(MODULE_ID, CONTAINER_ID_FLAG) !== this._item.id) continue;
      if (item.id === this._item.id) continue;
      if (seen.has(item.id)) continue;
      entries.push({
        itemId: item.id,
        itemUuid: item.uuid
      });
      seen.add(item.id);
    }

    return entries;
  }

  async _saveContents(entries) {
    await this._item.update({
      [`flags.${MODULE_ID}.contents`]: entries,
      [`flags.${MODULE_ID}.used`]: entries.length
    });
    this.render();
  }

  static _entryItemId(entry) {
    const itemUuid = String(entry?.itemUuid ?? entry?.uuid ?? '').trim();
    if (itemUuid) {
      const parts = itemUuid.split('.');
      return String(entry?.itemId ?? entry?.id ?? parts[parts.length - 1] ?? '').trim();
    }
    return String(entry?.itemId ?? entry?.id ?? '').trim();
  }

  async _removeContainedItem(itemId) {
    const entries = this._getContentEntries().filter(entry => ContainerWindow._entryItemId(entry) !== String(itemId));
    await this._saveContents(entries);
  }

  static async _extractDroppedItem(event) {
    const dataText = event.dataTransfer?.getData('text/plain')
      || event.dataTransfer?.getData('application/json')
      || '';
    if (!dataText) return null;

    let data = null;
    try {
      data = JSON.parse(dataText);
    } catch {
      return null;
    }

    const uuid = data?.uuid ?? data?.data?.uuid ?? data?.documentUuid ?? null;
    if (uuid) return fromUuid(uuid);

    return null;
  }

  async _onItemDragStart(event) {
    const row = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    const item = this._actor.items.get(itemId);
    if (!item) return;

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'Item',
      uuid: item.uuid,
      id: item.id
    }));
  }

  async _onSlotDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  async _onSlotDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const slot = Number(event.currentTarget.dataset.index);
    const item = await ContainerWindow._extractDroppedItem(event);
    if (!item) return;

    const resolved = await this._moveItemIntoContainer(item, slot);
    if (!resolved) return;
  }

  async _moveItemIntoContainer(item, slotIndex = null) {
    if (item.parent?.uuid === this._actor.uuid && item.id === this._item.id) {
      ui.notifications.warn('A container cannot contain itself.');
      return null;
    }

    const capacity = this._item.getFlag(MODULE_ID, 'capacity') ?? 6;
    const entries = this._getContentEntries();
    const alreadyOwned = item.parent?.uuid === this._actor.uuid;
    let currentId = String(item.id);
    const currentContainerId = item.getFlag(MODULE_ID, CONTAINER_ID_FLAG) ?? null;
    const existingIndex = entries.findIndex(entry => ContainerWindow._entryItemId(entry) === currentId);
    const nextEntries = entries.filter(entry => ContainerWindow._entryItemId(entry) !== currentId);
    const isNewToThisContainer = currentContainerId !== this._item.id && existingIndex === -1;

    const usedCost = nextEntries.reduce((sum, entry) => {
      const id = ContainerWindow._entryItemId(entry);
      const contained = id ? this._actor.items.get(id) : null;
      return sum + (contained ? itemSlotCost(contained) : 1);
    }, 0);
    const itemCost = itemSlotCost(item);

    if (isNewToThisContainer && usedCost + itemCost > capacity) {
      ui.notifications.warn(`"${this._item.name}" is full (${usedCost}/${capacity}).`);
      return null;
    }

    let target = item;
    if (!alreadyOwned) {
      const data = target.toObject();
      delete data._id;
      const [created] = await Item.implementation.create([data], { parent: this._actor }) ?? [];
      if (!created) return null;
      target = created;
      currentId = String(target.id);
      await target.unsetFlag(MODULE_ID, CONTAINER_ID_FLAG);
    }

    if (alreadyOwned && currentContainerId && currentContainerId !== this._item.id) {
      const previous = this._actor.items.get(currentContainerId);
      if (previous) {
        const previousEntries = (previous.getFlag(MODULE_ID, 'contents') ?? [])
          .map(ContainerWindow._normalizeEntry)
          .filter(Boolean)
          .filter(entry => ContainerWindow._entryItemId(entry) !== currentId);
        const previousUsed = this._actor.items.contents.filter(contained =>
          contained.id !== target.id &&
          contained.getFlag(MODULE_ID, CONTAINER_ID_FLAG) === currentContainerId
        ).length;
        await previous.update({
          [`flags.${MODULE_ID}.contents`]: previousEntries,
          [`flags.${MODULE_ID}.used`]: previousUsed
        });
      }
    }

    const insertAt = slotIndex == null ? nextEntries.length : Math.max(0, Math.min(slotIndex, nextEntries.length));
    nextEntries.splice(insertAt, 0, {
      itemId: currentId,
      itemUuid: target.uuid
    });

    await target.setFlag(MODULE_ID, CONTAINER_ID_FLAG, this._item.id);
    await this._saveContents(nextEntries);
    return target;
  }

  async _onAddSlot() {
    const current = this._item.getFlag(MODULE_ID, 'capacity') ?? 6;
    await this._item.setFlag(MODULE_ID, 'capacity', current + 1);
    this.render();
  }

  async _onRemoveItem(event) {
    event.preventDefault();
    event.stopPropagation();
    const row = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    const item = this._actor.items.get(itemId);
    if (!item) {
      await this._removeContainedItem(itemId);
      return;
    }

    await item.unsetFlag(MODULE_ID, CONTAINER_ID_FLAG);
    await this._removeContainedItem(itemId);
  }

  async _onItemClick(event) {
    event.preventDefault();
    const row = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    const item = this._actor.items.get(itemId);
    item?.sheet.render(true);
  }

  // ─── Close ────────────────────────────────────────────────────────────────

  async close(options = {}) {
    UIManager.deregister(this._registryKey);
    return super.close(options);
  }
}
