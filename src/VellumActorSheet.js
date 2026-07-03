/**
 * RNK™ Vellum — VellumActorSheet.js
 * ApplicationV2 actor sheet for the Vellum character sheet.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { getVellumData, setVellumData, buildStats, MODULE_ID, WEIGHTLESS_CATEGORIES, ROLLABLE_CATEGORIES, CONTAINER_ID_FLAG } from './VellumDataModel.js';
import { VellumSheetEvents } from './VellumSheetEvents.js';
import { toggleTokenGlow, refreshActorTokens } from './VellumTokenGlow.js';

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class VellumActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ['rnk-vellum', 'sheet', 'actor'],
    position: { width: 740, height: 900 },
    dragDrop: [
      { dropSelector: null }
    ],
    window:   {
      resizable: true,
      controls: [
        {
          icon:    'fas fa-fire',
          label:   'Toggle Token Glow',
          action:  'toggleTokenGlow'
        }
      ]
    },
    form:     { submitOnChange: false, closeOnSubmit: false },
    actions:  {
      toggleTokenGlow: async function() {
        const enabled = await toggleTokenGlow(this.actor);
        ui.notifications.info(
          `RNK™ Vellum: Token glow ${enabled ? 'enabled' : 'disabled'} for ${this.actor.name}.`
        );
        this.render();
      }
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/actor-sheet.hbs` }
  };

  get title() {
    return this.actor.name ?? 'Character';
  }

  static TRAIT_CATEGORIES = new Set(['talent', 'trait', 'knowledge', 'charm']);

  _inventoryUsed() {
    return this._prepareInventory().filter(i => !i.isWeightless).length;
  }

  async _removeItemFromContainer(item) {
    const containerId = item.getFlag(MODULE_ID, CONTAINER_ID_FLAG);
    if (!containerId) return;

    const container = this.actor.items.get(containerId);
    if (container) {
      const contents = (container.getFlag(MODULE_ID, 'contents') ?? []).filter(entry => {
        if (typeof entry === 'string') return true;
        if (!entry || typeof entry !== 'object') return true;
        const entryId = String(entry.itemId ?? entry.id ?? entry.itemUuid ?? entry.uuid ?? '');
        return entryId !== String(item.id) && entryId !== String(item.uuid);
      });
      await container.setFlag(MODULE_ID, 'contents', contents);
    }

    await item.unsetFlag(MODULE_ID, CONTAINER_ID_FLAG);
  }

  // ─── Context ──────────────────────────────────────────────────────────────

  async _prepareContext(options) {
    const vellum = getVellumData(this.actor);
    const invMax = Math.max(10, vellum.str?.score ?? 10);

    const inventory = this._prepareInventory();
    const inventoryGroups = this._groupInventory(inventory);
    const charmItem = this._prepareCharmItem();

    const SECTION_DEFAULTS = ['talent', 'trait', 'knowledge'];
    const savedOrder = this.actor.getFlag(MODULE_ID, 'bgSectionOrder');
    const sectionOrder = Array.isArray(savedOrder) ? savedOrder : SECTION_DEFAULTS;
    const sectionItems = {
      talent:    this._prepareTraitItems('talent'),
      trait:     this._prepareTraitItems('trait'),
      knowledge: this._prepareTraitItems('knowledge'),
    };
    const SECTION_LABELS = { talent: 'Talents', trait: 'Traits', knowledge: 'Knowledge' };
    const bgSections = sectionOrder.map(key => ({
      key,
      label: SECTION_LABELS[key] ?? key,
      items: sectionItems[key] ?? []
    }));

    const actorFlags    = this.actor.getFlag(MODULE_ID, 'actorSettings') ?? {};
    const blessingCount = actorFlags.blessingCount ?? (game.settings.get(MODULE_ID, 'blessingCount') ?? 3);

    // Only physical (non-weightless) items consume inventory slots
    const inventoryUsed = inventory.filter(i => !i.isWeightless).length;
    const xpLevel = Math.max(1, Math.min(vellum.level ?? 1, 20));
    const xpMax   = xpLevel * 10;

    return {
      actor:           this.actor,
      vellum,
      statsLeft:       buildStats(vellum, ['str', 'dex', 'con']),
      statsRight:      buildStats(vellum, ['int', 'wis', 'cha']),
      inventory,
      inventoryGroups,
      inventoryUsed,
      inventoryMax:    invMax,
      charmItem,
      bgSections,
      blessingCount,
      showB1:          blessingCount >= 1,
      showB2:          blessingCount >= 2,
      showB3:          blessingCount >= 3,
      tokenGlowEnabled: this.actor.getFlag(MODULE_ID, 'tokenGlow') ?? false,
      xpMax,
      moduleId:      MODULE_ID,
      isOwner:       this.actor.isOwner,
      isGM:          game.user.isGM
    };
  }

  _prepareCharmItem() {
    const it = this.actor.items.contents.find(
      i => i.getFlag(MODULE_ID, 'category') === 'charm'
    );
    if (!it) return null;
    return {
      itemId:   String(it.id),
      itemName: String(it.name ?? ''),
      itemImg:  it.img ?? ''
    };
  }

  _prepareInventory() {
    const slots = [];
    let autoSlot = 1000; // high number so auto-slotted items sort after manually slotted ones
    for (const it of this.actor.items.contents) {
      const flagCategory = it.getFlag(MODULE_ID, 'category') ?? 'gear';
      const containerId  = it.getFlag(MODULE_ID, CONTAINER_ID_FLAG);
      const inferredCategory = flagCategory === 'gear'
        ? ((it.type ?? '').toLowerCase() === 'spell' ? 'spell' : flagCategory)
        : flagCategory;
      const category = inferredCategory;
      // Items in trait/talent/knowledge/charm categories are shown elsewhere, not in inventory
      if (containerId || VellumActorSheet.TRAIT_CATEGORIES.has(category)) continue;
      const slot = it.getFlag(MODULE_ID, 'slot') ?? autoSlot++;
      const type     = it.getFlag(MODULE_ID, 'type')     ?? 'standard';
      const damage   = it.getFlag(MODULE_ID, 'damage')   ?? '';
      const weight   = it.getFlag(MODULE_ID, 'weight')   ?? '';
      const equipped = it.getFlag(MODULE_ID, 'equipped') ?? false;
      const capacity = it.getFlag(MODULE_ID, 'capacity') ?? null;
      const used     = it.getFlag(MODULE_ID, 'used')     ?? null;

      // Weightless: spell/ability categories don't consume inventory slots
      const isWeightless = WEIGHTLESS_CATEGORIES.has(category);

      // Rollable: weapons + spells/abilities + anything with a damage formula
      const hasFormula = !!(damage || it.system?.damage?.formula
        || it.system?.damage?.parts?.length);
      const isRollable = ROLLABLE_CATEGORIES.has(category) || hasFormula;

      // Build tags array for display
      const tags = [];
      if (damage)  tags.push(damage);
      if (category !== 'gear') tags.push(category.charAt(0).toUpperCase() + category.slice(1));
      if (weight)  tags.push(weight);
      if (type === 'container' && capacity != null) tags.push(`${used ?? 0}/${capacity}`);

      slots.push({
        slot,
        itemId:      String(it.id),
        itemName:    String(it.name ?? ''),
        itemImg:     it.img ?? '',
        isContainer: type === 'container',
        isNotepad:   type === 'notepad',
        isWeapon:    category === 'weapon',
        isWeightless,
        isRollable,
        equipped,
        damage,
        weight,
        category,
        tags,
        capacity,
        used
      });
    }
    return slots.sort((a, b) => a.slot - b.slot);
  }

  _groupInventory(inventory) {
    // Default category order — can be reordered by the user
    const DEFAULT_ORDER = ['weapon', 'armor', 'shield', 'consumable', 'tool', 'spell', 'ability', 'container', 'notepad', 'misc', 'gear'];
    const saved = this.actor.getFlag(MODULE_ID, 'groupOrder');
    const order = Array.isArray(saved) ? saved : DEFAULT_ORDER;

    // Bucket items by category
    const buckets = new Map();
    for (const item of inventory) {
      const key = item.isContainer ? 'container' : item.isNotepad ? 'notepad' : (item.category ?? 'gear');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(item);
    }

    // Build ordered groups, only include categories that have items
    const groups = [];
    for (const cat of order) {
      if (buckets.has(cat)) {
        groups.push({
          category:   cat,
          label:      cat.charAt(0).toUpperCase() + cat.slice(1),
          items:      buckets.get(cat),
          isWeightless: WEIGHTLESS_CATEGORIES.has(cat)
        });
        buckets.delete(cat);
      }
    }
    // Any leftover categories not in the order list
    for (const [cat, items] of buckets) {
      groups.push({
        category:   cat,
        label:      cat.charAt(0).toUpperCase() + cat.slice(1),
        items,
        isWeightless: WEIGHTLESS_CATEGORIES.has(cat)
      });
    }

    return groups;
  }

  _prepareTraitItems(category) {
    return this.actor.items.contents
      .filter(it => it.getFlag(MODULE_ID, 'category') === category)
      .sort((a, b) => (a.getFlag(MODULE_ID, 'traitSort') ?? 0) - (b.getFlag(MODULE_ID, 'traitSort') ?? 0))
      .map(it => ({
        itemId:      String(it.id),
        itemName:    String(it.name ?? ''),
        itemImg:     it.img ?? '',
        description: it.system?.description?.value
                  ?? it.system?.description
                  ?? it.getFlag(MODULE_ID, 'description')
                  ?? ''
      }));
  }

  // ─── Drop handling ────────────────────────────────────────────────────────

  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;

    // Check if dropped onto a trait list — assign category flag
    // Check drop target — trait list or charm slot
    const traitList  = event.target?.closest?.('[data-category]');
    const charmSlot  = event.target?.closest?.('.vellum-charm-slot');
    const dropCategory = charmSlot ? 'charm' : (traitList?.dataset?.category ?? null);
    const RECLASSIFY_CATEGORIES = new Set(['talent', 'trait', 'knowledge', 'charm']);
    const currentCategory = item.getFlag(MODULE_ID, 'category') ?? 'gear';
    const currentContainerId = item.getFlag(MODULE_ID, CONTAINER_ID_FLAG) ?? null;
    const typeSlug = String(item.type ?? '').toLowerCase();
    const isSpellLike = currentCategory === 'spell' || item.system?.isSpell || typeSlug === 'spell';
    const isAbilityLike = currentCategory === 'ability' || item.system?.isAbility || typeSlug === 'ability';
    const isWeightlessItem = WEIGHTLESS_CATEGORIES.has(currentCategory) || isSpellLike || isAbilityLike;
    const isOnThisActor = this.actor.uuid === item.parent?.uuid;
    const currentCountsTowardInventory =
      isOnThisActor &&
      !currentContainerId &&
      !isWeightlessItem &&
      !VellumActorSheet.TRAIT_CATEGORIES.has(currentCategory);
    const nextCategory = dropCategory ?? currentCategory;
    const nextCountsTowardInventory =
      !isWeightlessItem &&
      !VellumActorSheet.TRAIT_CATEGORIES.has(nextCategory);
    const inventoryMax = Math.max(10, getVellumData(this.actor).str?.score ?? 10);
    const inventoryUsed = this._inventoryUsed();
    const nextInventoryUsed = inventoryUsed
      - (currentCountsTowardInventory ? 1 : 0)
      + (nextCountsTowardInventory ? 1 : 0);

    if (nextCountsTowardInventory && nextInventoryUsed > inventoryMax) {
      ui.notifications.warn(`Inventory is full (${inventoryUsed}/${inventoryMax}).`);
      return null;
    }

    if (this.actor.uuid === item.parent?.uuid) {
      // Item already on this actor — reclassify if dropped onto a recognised section
      if (dropCategory && RECLASSIFY_CATEGORIES.has(dropCategory)) {
        if (currentContainerId) await this._removeItemFromContainer(item);
        // Charm slot: move any existing charm item back to gear first
        if (dropCategory === 'charm') {
          const existing = this.actor.items.contents.find(
            i => i.getFlag(MODULE_ID, 'category') === 'charm' && i.id !== item.id
          );
          if (existing) await existing.setFlag(MODULE_ID, 'category', 'gear');
        }
        const existing = this.actor.items.get(item.id);
        if (existing) return existing.setFlag(MODULE_ID, 'category', dropCategory);
      }

      if (currentContainerId && !dropCategory) {
        await this._removeItemFromContainer(item);
        return item;
      }

      return null;
    }

    const keepId = !this.actor.items.has(item.id);
    const data = item.inCompendium
      ? game.items.fromCompendium(item, { clearFolder: true, keepId })
      : item.toObject();

    // Charm slot: displace any existing charm item before adding new one
    if (dropCategory === 'charm') {
      const existing = this.actor.items.contents.find(
        i => i.getFlag(MODULE_ID, 'category') === 'charm'
      );
      if (existing) await existing.setFlag(MODULE_ID, 'category', 'gear');
    }

    const [created] = await Item.implementation.create([data], { parent: this.actor, keepId }) ?? [];
    if (created && dropCategory && RECLASSIFY_CATEGORIES.has(dropCategory)) {
      await created.setFlag(MODULE_ID, 'category', dropCategory);
    }
    if (created && currentContainerId) await created.unsetFlag(MODULE_ID, CONTAINER_ID_FLAG);
    return created ?? null;
  }

  async _onDropActor(event, data) {
    // Not supported — ignore actor drops
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._applyActorSettings();
    if (!this.isEditable) return;
    VellumSheetEvents.bind(this.element, this);
  }

  _applyActorSettings() {
    const el = this.element;
    if (!el) return;
    // Per-actor overrides from GM Hub take priority over global client settings
    const flags = this.actor.getFlag(MODULE_ID, 'actorSettings') ?? {};
    const glowEnabled = this.actor.getFlag(MODULE_ID, 'tokenGlow') ?? false;
    if (flags.glowColor)     el.style.setProperty('--vellum-glow-color',  flags.glowColor);
    if (flags.glowBlur   != null) el.style.setProperty('--vellum-glow-blur',   `${flags.glowBlur}px`);
    if (flags.glowSpread != null) el.style.setProperty('--vellum-glow-spread', `${flags.glowSpread}px`);
    if (flags.blessingColor) el.style.setProperty('--vellum-blessing-on', flags.blessingColor);
    const portraitGlow = glowEnabled
      ? 'drop-shadow(0 0 var(--vellum-glow-blur) var(--vellum-glow-color)) drop-shadow(0 0 var(--vellum-glow-spread) var(--vellum-glow-color))'
      : 'none';
    const portraitGlowHover = glowEnabled
      ? 'drop-shadow(0 0 calc(var(--vellum-glow-blur) * 1.6) var(--vellum-glow-color)) drop-shadow(0 0 calc(var(--vellum-glow-spread) * 1.6) var(--vellum-glow-color))'
      : 'none';
    el.style.setProperty('--vellum-portrait-glow', portraitGlow);
    el.style.setProperty('--vellum-portrait-glow-hover', portraitGlowHover);
  }

}
