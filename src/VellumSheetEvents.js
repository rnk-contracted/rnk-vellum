/**
 * RNK™ Vellum — VellumSheetEvents.js
 * All event listener bindings for VellumActorSheet (ApplicationV2).
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { setVellumData, getVellumData, MODULE_ID, WEIGHTLESS_CATEGORIES } from './VellumDataModel.js';
import { UIManager } from './UIManager.js';

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
      node.addEventListener('change', e => VellumSheetEvents._onFieldChange(e, actor))
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

    // Inventory — left-click item name opens sheet / sub-window
    qa('.vellum-item-name').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemClick(e, actor))
    );

    // Inventory — right-click row opens context menu
    qa('.vellum-inv-row').forEach(node =>
      node.addEventListener('contextmenu', e => VellumSheetEvents._onItemContext(e, actor, sheet))
    );

    // Inventory — equip toggle
    qa('.vellum-item-equip').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemEquip(e, actor))
    );

    // Inventory — edit button
    qa('.vellum-item-edit').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemClick(e, actor))
    );

    // Inventory — roll attack/damage
    qa('.vellum-item-roll').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemRoll(e, actor))
    );

    // Inventory — delete item
    qa('.vellum-item-delete').forEach(node =>
      node.addEventListener('click', e => VellumSheetEvents._onItemDelete(e, actor))
    );

    // Inventory group drag-to-reorder
    VellumSheetEvents._bindGroupDrag(el, actor);

    // Trait/Talent/Knowledge — add buttons
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

    // Background sections — drag to reorder (Talents / Traits / Knowledge)
    VellumSheetEvents._bindSectionDrag(el, actor);

    // Trait rows — drag to reorder within each list
    qa('.vellum-trait-list').forEach(list =>
      VellumSheetEvents._bindTraitDrag(list, actor)
    );

    // Charm slot — edit button (reuse item click handler)
    q('.vellum-charm-row .vellum-item-edit')
      ?.addEventListener('click', e => VellumSheetEvents._onItemClick(e, actor));

    // Charm slot — remove (unequip from charm slot → reassign to gear)
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

  static async _onFieldChange(event, actor) {
    event.preventDefault();
    const el    = event.currentTarget;
    const field = el.dataset.vellumField;
    const value = el.type === 'number' ? Number(el.value) : el.value;
    return setVellumData(actor, foundry.utils.expandObject({ [field]: value }));
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
    if (invType !== 'standard') await created.setFlag(MODULE_ID, 'type', invType);
    // Open our V2 sheet explicitly — avoids Shadowdark’s V1 ItemSheetSD
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

    const type = item.getFlag(MODULE_ID, 'type');
    if (type === 'container') return UIManager.openContainer(item, actor);
    if (type === 'notepad')   return UIManager.openNotepad(item, actor);
    // Open our V2 sheet explicitly — avoids Shadowdark’s V1 ItemSheetSD
    const { VellumItemSheet } = await import('./VellumItemSheet.js');
    new VellumItemSheet(item).render({ force: true });
  }

  static _onItemContext(event, actor, sheet) {
    event.preventDefault();
    event.stopPropagation();

    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;

    const item = actor.items.get(itemId);
    if (!item) return;

    // Remove any existing context menu
    document.querySelector('.vellum-context-menu')?.remove();

    const menu = document.createElement('nav');
    menu.className = 'vellum-context-menu';
    menu.style.cssText = `position:fixed;left:${event.clientX}px;top:${event.clientY}px;z-index:9999`;

    const entries = [
      { label: 'Edit',      action: () => item.sheet.render(true) },
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
    return item.setFlag(MODULE_ID, 'equipped', !current);
  }

  static async _onItemRoll(event, actor) {
    event.preventDefault();
    event.stopPropagation();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    const item = actor.items.get(itemId);
    if (!item) return;

    const category  = item.getFlag(MODULE_ID, 'category') ?? 'gear';
    const isSpell   = WEIGHTLESS_CATEGORIES.has(category);

    // Weapons / physical items: delegate to the system-native roll when present.
    // Do NOT wrap in try-catch — let any system error surface in the console.
    if (!isSpell) {
      if (typeof item.roll === 'function') return item.roll();
      if (typeof item.use  === 'function') return item.use();
    }

    // Manual roll path (spells, abilities, and anything without a native roll).
    const vellum = getVellumData(actor);

    // Formula: vellum flag first (user-set), then system paths, then default
    const flagFormula = item.getFlag(MODULE_ID, 'damage') || '';
    const sysFormula  = item.system?.damage?.formula
      || item.system?.damage?.parts?.[0]?.[0]
      || item.system?.formula
      || '';
    const baseFormula = flagFormula || sysFormula || (isSpell ? '1d20' : '1d6');

    // Modifier: WIS for spells/abilities, STR for weapons/gear
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

  static async _onItemDelete(event, actor) {
    event.preventDefault();
    event.stopPropagation();
    const row    = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    return actor.deleteEmbeddedDocuments('Item', [itemId]);
  }

  static _bindGroupDrag(el, actor) {
    const list = el.querySelector('#vellum-inv-groups');
    if (!list) return;
    let dragged = null;

    list.querySelectorAll('.vellum-inv-group').forEach(group => {
      group.addEventListener('dragstart', e => {
        dragged = group;
        group.classList.add('vellum-inv-group--dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      group.addEventListener('dragend', () => {
        group.classList.remove('vellum-inv-group--dragging');
        list.querySelectorAll('.vellum-inv-group').forEach(g => g.classList.remove('vellum-inv-group--over'));
        // Save new order to actor flag
        const order = [...list.querySelectorAll('.vellum-inv-group')].map(g => g.dataset.category);
        actor.setFlag(MODULE_ID, 'groupOrder', order);
      });

      group.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragged || dragged === group) return;
        list.querySelectorAll('.vellum-inv-group').forEach(g => g.classList.remove('vellum-inv-group--over'));
        group.classList.add('vellum-inv-group--over');

        const rect = group.getBoundingClientRect();
        const mid  = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          list.insertBefore(dragged, group);
        } else {
          list.insertBefore(dragged, group.nextSibling);
        }
      });

      group.addEventListener('dragleave', () => {
        group.classList.remove('vellum-inv-group--over');
      });
    });
  }

  static _bindSectionDrag(el, actor) {
    const container = el.querySelector('#vellum-bg-sections');
    if (!container) return;
    let dragged = null;

    const getSections = () => [...container.querySelectorAll('.vellum-bg-section')];

    getSections().forEach(section => {
      // Only start drag from the section drag handle, not from inner elements
      section.addEventListener('dragstart', e => {
        if (!e.target.classList.contains('vellum-bg-section-drag')) return;
        dragged = section;
        section.classList.add('vellum-bg-section--dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'vellum-section-reorder');
        e.stopPropagation();
      });

      section.addEventListener('dragend', () => {
        if (!dragged) return;
        section.classList.remove('vellum-bg-section--dragging');
        getSections().forEach(s => s.classList.remove('vellum-bg-section--over'));
        dragged = null;
        const order = getSections().map(s => s.dataset.section);
        actor.setFlag(MODULE_ID, 'bgSectionOrder', order);
      });

      section.addEventListener('dragover', e => {
        if (!dragged || dragged === section) return;
        e.preventDefault();
        e.stopPropagation();
        getSections().forEach(s => s.classList.remove('vellum-bg-section--over'));
        section.classList.add('vellum-bg-section--over');
        const rect = section.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          container.insertBefore(dragged, section);
        } else {
          container.insertBefore(dragged, section.nextSibling);
        }
      });

      section.addEventListener('dragleave', () => {
        section.classList.remove('vellum-bg-section--over');
      });
    });
  }

  static _bindTraitDrag(list, actor) {
    let dragged = null;

    const getRows = () => [...list.querySelectorAll('.vellum-trait-row')];

    getRows().forEach(row => {
      row.addEventListener('dragstart', e => {
        dragged = row;
        row.classList.add('vellum-trait-row--dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'vellum-trait-reorder');
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('vellum-trait-row--dragging');
        getRows().forEach(r => r.classList.remove('vellum-trait-row--over'));
        dragged = null;
        // Persist new order — one update per item with traitSort index
        const rows = getRows();
        rows.forEach((r, i) => {
          const item = actor.items.get(r.dataset.itemId);
          if (item) item.setFlag(MODULE_ID, 'traitSort', i);
        });
      });

      row.addEventListener('dragover', e => {
        if (!dragged || dragged === row) return;
        e.preventDefault();
        getRows().forEach(r => r.classList.remove('vellum-trait-row--over'));
        row.classList.add('vellum-trait-row--over');
        const rect = row.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          list.insertBefore(dragged, row);
        } else {
          list.insertBefore(dragged, row.nextSibling);
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('vellum-trait-row--over');
      });
    });

    // Drop zone highlight for compendium drops (dragged is null = external drag)
    list.addEventListener('dragover', e => {
      if (dragged) return; // internal reorder handles its own feedback
      e.preventDefault();
      list.classList.add('drag-over');
    });
    list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
    list.addEventListener('drop', () => list.classList.remove('drag-over'));
  }

  static async _onStatRoll(event, actor) {
    event.preventDefault();
    const btn  = event.currentTarget;
    const stat = btn.dataset.stat.toUpperCase();
    const mod  = parseInt(btn.dataset.mod) || 0;
    const roll = await new Roll(`1d20 + ${mod}`).evaluate();
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor:  `${actor.name} — ${stat} Check`
    });
  }

  static async _onTraitAdd(event, actor) {
    const category = event.currentTarget.dataset.category ?? 'trait';
    const label    = category.charAt(0).toUpperCase() + category.slice(1);

    // Let the user pick the type via Foundry's built-in creation dialog
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
    // Move item back to regular inventory (gear category)
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
