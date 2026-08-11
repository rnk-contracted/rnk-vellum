/**
 * RNK™ Vellum — VellumSheetEvents.js
 * All event listener bindings for VellumActorSheet (ApplicationV2).
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import {
  setVellumData, getVellumData, MODULE_ID, WEIGHTLESS_CATEGORIES,
  resolveItemCategory, resolveItemType, ensureContainerFlags, defaultContainerCapacity
} from './VellumDataModel.js';
import { UIManager } from './UIManager.js';
import { VellumSheetDrag } from './VellumSheetDrag.js';

export class VellumSheetEvents {

  /**
   * Bind all listeners to the rendered sheet element (plain DOM HTMLElement).
   * @param {HTMLElement} el
   * @param {VellumActorSheet} sheet
   */
  static bind(el, sheet) {
    const actor = sheet.actor;
    const q  = s => el.querySelector(s);
    const qa = s => el.querySelectorAll(s);

    // Inline field changes
    qa('[data-vellum-field]').forEach(node =>
      node.addEventListener('change', e => VellumSheetEvents._onFieldChange(e, actor, sheet))
    );

    // Actor name
    q('.vellum-actor-name')
      ?.addEventListener('change', e => actor.update({ name: e.currentTarget.value }));

    // Stat roll buttons
    qa('.vellum-stat-roll').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onStatRoll(e, actor))
    );

    // Blessing tokens
    qa('.vellum-blessing').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onBlessingToggle(e, actor))
    );

    // Inventory — split add button (toggle menu) + menu options
    q('.vellum-inv-add')
      ?.addEventListener('click', e => VellumSheetEvents._onAddMenuToggle(e));

    qa('.vellum-inv-add-option').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemAdd(e, actor))
    );

    // Inventory — left-click item name opens sheet (standard items).
    // Containers / notepads open on double-click (Cairn-style).
    qa('.vellum-item-name').forEach(node => {
      node.addEventListener('click', e => VellumSheetEvents._onItemClick(e, actor));
      node.addEventListener('dblclick', e => VellumSheetEvents._onItemDblClick(e, actor));
    });

    // Inventory — right-click row opens context menu
    qa('.vellum-inv-row').forEach(node =>
      node.addEventListener('contextmenu', e => VellumSheetEvents._onItemContext(e, actor, sheet))
    );

    // Inventory — equip toggle
    qa('.vellum-item-equip').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemEquip(e, actor))
    );

    // Inventory — edit button (pencil)
    qa('.vellum-item-edit').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemEditClick(e, actor))
    );

    // Inventory — roll attack/damage
    qa('.vellum-item-roll').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemRoll(e, actor))
    );

    // Inventory — delete item
    qa('.vellum-item-delete').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemDelete(e, actor))
    );

    // Inventory rows may be dragged into containers or other pack slots
    qa('.vellum-inv-row').forEach(node =>
      node.addEventListener('dragstart', e => VellumSheetDrag.onInventoryDragStart(e, actor))
    );

    // Trait/Talent — add buttons
    qa('.vellum-trait-add').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onTraitAdd(e, actor))
    );

    // Trait/Talent/Knowledge — delete buttons
    qa('.vellum-trait-delete').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onTraitDelete(e, actor))
    );

    // Trait/Talent/Knowledge — click name to open sheet
    qa('.vellum-trait-name').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onTraitClick(e, actor))
    );

    // Background sections — drag to reorder
    VellumSheetDrag.bindSectionDrag(el, actor);

    // Trait rows — drag to reorder within each list
    qa('.vellum-trait-list').forEach(list =>
      VellumSheetDrag.bindTraitDrag(list, actor)
    );

    // Charm slot — edit button
    q('.vellum-charm-row .vellum-item-edit')
      ?.addEventListener('click', e => VellumSheetEvents._onItemEditClick(e, actor));

    // Charm slot — remove
    q('.vellum-charm-unequip')
      ?.addEventListener('click', e => VellumSheetEvents._onCharmUnequip(e, actor));

    // Portrait click → file picker
    q('.vellum-portrait')
      ?.addEventListener('click', e => VellumSheetEvents._onPortraitClick(e, actor));

    // Deity portrait click → file picker
    q('.vellum-deity-portrait')
      ?.addEventListener('click', e => VellumSheetEvents._onDeityPortraitClick(e, actor));
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  static async _onFieldChange(event, actor, sheet) {
    event.preventDefault();
    const el    = event.currentTarget;
    const field = el.dataset.vellumField;
    if (el.readOnly) return;
    const value = el.type === 'number' ? Number(el.value) : el.value;
    await setVellumData(actor, foundry.utils.expandObject({ [field]: value }));
    if (field === 'level') {
      sheet?.render(true);
    }
  }

  static async _onBlessingToggle(event, actor) {
    event.preventDefault();
    const key     = event.currentTarget.dataset.key;
    const current = getVellumData(actor).blessings?.[key] ?? true;
    return setVellumData(actor, { blessings: { [key]: !current } });
  }

  static _onAddMenuToggle(event) {
    event.preventDefault();
    event.stopPropagation();
    const btn  = event.currentTarget;
    const menu = btn.parentElement?.querySelector('.vellum-inv-add-menu');
    if (!menu) return;
    const hidden = menu.hasAttribute('hidden');
    menu.toggleAttribute('hidden', !hidden);
    if (hidden) {
      const dismiss = ev => {
        if (!menu.contains(ev.target) && ev.target !== btn) {
          menu.setAttribute('hidden', '');
          document.removeEventListener('mousedown', dismiss);
        }
      };
      setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
    }
  }

  static async _onItemAdd(event, actor) {
    event.preventDefault();
    const invType = event.currentTarget.dataset.invType ?? 'standard';
    const validTypes = game.documentTypes?.Item?.filter(t => t !== 'base') ?? [];
    const type = validTypes[0] ?? 'item';
    const nameMap = { container: 'New Container', notepad: 'New Notepad' };
    const [created] = await actor.createEmbeddedDocuments('Item', [{
      name: nameMap[invType] ?? 'New Item',
      type
    }]);
    if (!created) return;

    if (invType === 'container') {
      await created.update({
        [`flags.${MODULE_ID}.type`]: 'container',
        [`flags.${MODULE_ID}.capacity`]: defaultContainerCapacity(created)
      });
      return UIManager.openContainer(created, actor);
    }
    if (invType === 'notepad') {
      await created.setFlag(MODULE_ID, 'type', 'notepad');
      return UIManager.openNotepad(created, actor);
    }

    const { VellumItemSheet } = await import('./VellumItemSheet.js');
    new VellumItemSheet(created).render({ force: true });
  }

  static async _onItemClick(event, actor) {
    event.preventDefault();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    const item = actor.items.get(itemId);
    if (!item) return;

    const vellumType = resolveItemType(item);
    // Containers / notepads open on double-click only (Cairn-style).
    if (vellumType === 'container' || vellumType === 'notepad') return;

    const { VellumItemSheet } = await import('./VellumItemSheet.js');
    new VellumItemSheet(item).render({ force: true });
  }

  static async _onItemDblClick(event, actor) {
    event.preventDefault();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    const item = actor.items.get(itemId);
    if (!item) return;

    const vellumType = resolveItemType(item);
    if (vellumType === 'container') {
      await ensureContainerFlags(item);
      return UIManager.openContainer(item, actor);
    }
    if (vellumType === 'notepad') return UIManager.openNotepad(item, actor);
  }

  static async _onItemEditClick(event, actor) {
    event.preventDefault();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    const item = actor.items.get(itemId);
    if (!item) return;

    const vellumType = resolveItemType(item);
    // Pencil opens containers/notepads (discoverable without knowing dbl-click)
    if (vellumType === 'container') {
      await ensureContainerFlags(item);
      return UIManager.openContainer(item, actor);
    }
    if (vellumType === 'notepad') return UIManager.openNotepad(item, actor);
    return item.sheet.render(true);
  }

  static _onItemContext(event, actor, sheet) {
    event.preventDefault();
    event.stopPropagation();

    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    const item = actor.items.get(itemId);
    if (!item) return;

    document.querySelector('.vellum-context-menu')?.remove();

    const menu = document.createElement('nav');
    menu.className = 'vellum-context-menu';
    menu.style.cssText = `position:fixed;left:${event.clientX}px;top:${event.clientY}px;z-index:9999`;

    const entries = [
      { label: 'Edit',            action: () => item.sheet.render(true) },
      { label: 'Vellum Settings', action: async () => {
          const { VellumItemSheet } = await import('./VellumItemSheet.js');
          new VellumItemSheet(item).render({ force: true });
        }
      },
      { label: 'Duplicate', action: async () => {
          const d = item.toObject();
          delete d._id;
          await actor.createEmbeddedDocuments('Item', [d]);
        }
      },
      { divider: true },
      { label: 'Delete', action: () => actor.deleteEmbeddedDocuments('Item', [itemId]), danger: true }
    ];

    for (const e of entries) {
      if (e.divider) {
        const hr = document.createElement('div');
        hr.className = 'vellum-context-divider';
        menu.appendChild(hr);
        continue;
      }
      const li = document.createElement('div');
      li.className = 'vellum-context-item' + (e.danger ? ' vellum-context-item--danger' : '');
      li.textContent = e.label;
      li.addEventListener('click', () => { menu.remove(); e.action(); });
      menu.appendChild(li);
    }

    document.body.appendChild(menu);

    const dismiss = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', dismiss); } };
    setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
  }

  static async _onItemEquip(event, actor) {
    event.preventDefault();
    event.stopPropagation();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    const item    = actor.items.get(itemId);
    if (!item) return;
    const current = item.getFlag(MODULE_ID, 'equipped') ?? false;
    const next    = !current;
    const sysUpdate = {};
    if (item.system?.equipped !== undefined) sysUpdate['system.equipped'] = next;
    await item.setFlag(MODULE_ID, 'equipped', next);
    if (Object.keys(sysUpdate).length) await item.update(sysUpdate);
  }

  static async _onItemRoll(event, actor) {
    event.preventDefault();
    event.stopPropagation();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    const item = actor.items.get(itemId);
    if (!item) return;

    const category   = resolveItemCategory(item);
    const isSpell    = WEIGHTLESS_CATEGORIES.has(category) || !!(item.system?.isSpell);
    const rollConfig = { skipPrompt: event.shiftKey };
    const typeSlug   = String(item.type ?? '').toLowerCase();
    const isNativeWeapon = !!(item.system?.isWeapon) || typeSlug === 'weapon' || category === 'weapon';
    const isNativeSpell  = !!(item.system?.isSpell)  || typeSlug === 'spell'  || category === 'spell';

    if (isNativeWeapon && typeof actor.system?.rollAttack === 'function') {
      try { return await actor.system.rollAttack(item.uuid, rollConfig); }
      catch (err) { console.warn('RNK Vellum: native rollAttack failed, falling back', err); }
    }

    if (isNativeSpell && typeof actor.system?.castSpell === 'function') {
      try { return await VellumSheetEvents._castSpellForAnyActor(actor, item, rollConfig); }
      catch (err) { console.warn('RNK Vellum: native castSpell failed, falling back', err); }
    }

    if (!isSpell) {
      if (typeof item.rollAttack === 'function') return item.rollAttack();
      if (typeof item.roll === 'function') return item.roll();
      if (typeof item.use === 'function') return item.use();
    }

    const vellum = getVellumData(actor);
    const flagFormula = item.getFlag(MODULE_ID, 'damage') || '';
    const sysFormula  = item.system?.damage?.formula
      || item.system?.damage?.parts?.[0]?.[0]
      || item.system?.damage?.oneHanded
      || item.system?.damage?.twoHanded
      || item.system?.formula
      || '';
    const baseFormula = flagFormula || sysFormula || (isSpell ? '1d20' : '1d6');

    const statKey  = isSpell ? 'wis' : 'str';
    const modScore = vellum[statKey]?.score ?? 10;
    const mod      = Math.floor((modScore - 10) / 2);
    const formula  = mod !== 0 ? `${baseFormula} + ${mod}` : baseFormula;

    const roll = await new Roll(formula).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor:  `${actor.name} \u2014 ${item.name}`
    });
  }

  static async _castSpellForAnyActor(actor, item, rollConfig = {}) {
    const model = actor.system;
    const spellcasting = model?.spellcasting;
    const classes = spellcasting?.classes;
    const forceUniversalCasting = model?.isSpellCaster === false && Array.isArray(classes);

    if (!forceUniversalCasting) {
      return model.castSpell(item.uuid, rollConfig);
    }

    // Shadowdark rejects spells when the actor has no casting class.
    // Temporarily expose the "all items" path so native cast flow still runs.
    const marker = `${MODULE_ID}-universal-caster`;
    const previousAllowAllItems = spellcasting.allowAllItems;
    classes.push(marker);
    spellcasting.allowAllItems = true;

    try {
      return await model.castSpell(item.uuid, rollConfig);
    } finally {
      const markerIndex = classes.indexOf(marker);
      if (markerIndex !== -1) classes.splice(markerIndex, 1);
      spellcasting.allowAllItems = previousAllowAllItems;
    }
  }

  static async _onItemDelete(event, actor) {
    event.preventDefault();
    event.stopPropagation();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    return actor.deleteEmbeddedDocuments('Item', [itemId]);
  }

  static async _onStatRoll(event, actor) {
    event.preventDefault();
    const btn  = event.currentTarget;
    const statKey = btn.dataset.stat?.toLowerCase();
    if (!statKey) return;

    if (typeof actor.system?.rollStatCheck === 'function') {
      return actor.system.rollStatCheck(statKey, { skipPrompt: event.shiftKey });
    }

    const stat = statKey.toUpperCase();
    const mod  = parseInt(btn.dataset.mod) || 0;
    const formula = mod === 0 ? '1d20' : `1d20 + ${mod}`;
    const roll = await new Roll(formula).evaluate();
    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor:  `${actor.name} — ${stat} Check`
    });
  }

  static async _onTraitAdd(event, actor) {
    const category = event.currentTarget.dataset.category ?? 'trait';
    const label    = category.charAt(0).toUpperCase() + category.slice(1);

    const created = await Item.implementation.createDialog(
      { name: `New ${label}` },
      { parent: actor, pack: null }
    );
    if (created) {
      await created.setFlag(MODULE_ID, 'category', category);
    }
  }

  static async _onTraitDelete(event, actor) {
    event.preventDefault();
    event.stopPropagation();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    return actor.deleteEmbeddedDocuments('Item', [itemId]);
  }

  static _onTraitClick(event, actor) {
    event.preventDefault();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    const item = actor.items.get(itemId);
    item?.sheet.render(true);
  }

  static async _onCharmUnequip(event, actor) {
    event.preventDefault();
    event.stopPropagation();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    const item = actor.items.get(itemId);
    if (!item) return;
    return item.setFlag(MODULE_ID, 'category', 'gear');
  }

  static _onPortraitClick(event, actor) {
    event.preventDefault();
    const FP = foundry.applications.apps.FilePicker.implementation;
    new FP({
      type:     'image',
      current:  actor.img ?? '',
      callback: path => actor.update({ img: path })
    }).browse();
  }

  static async _onDeityPortraitClick(event, actor) {
    event.preventDefault();
    const FP      = foundry.applications.apps.FilePicker.implementation;
    const current = getVellumData(actor).animalDeityPortrait ?? '';
    new FP({
      type:     'image',
      current,
      callback: path => setVellumData(actor, { animalDeityPortrait: path })
    }).browse();
  }
}
