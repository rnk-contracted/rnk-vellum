/**
 * RNK™ Vellum — VellumSheetDrag.js
 * Drag-and-drop reorder bindings for inventory groups, background sections,
 * and trait rows on the Vellum actor sheet.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { MODULE_ID } from './VellumDataModel.js';

export class VellumSheetDrag {

  static onInventoryDragStart(event, actor) {
    const row = event.currentTarget.closest('[data-item-id]');
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    const item = actor.items.get(itemId);
    if (!item) return;

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'Item',
      uuid: item.uuid,
      id: item.id
    }));
  }

  static bindGroupDrag(el, actor) {
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

  static bindSectionDrag(el, actor) {
    const container = el.querySelector('#vellum-bg-sections');
    if (!container) return;
    let dragged = null;

    const getSections = () => [...container.querySelectorAll('.vellum-bg-section')];

    getSections().forEach(section => {
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

  static bindTraitDrag(list, actor) {
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

    // Drop zone highlight for external/compendium drops
    list.addEventListener('dragover', e => {
      if (dragged) return;
      e.preventDefault();
      list.classList.add('drag-over');
    });
    list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
    list.addEventListener('drop', () => list.classList.remove('drag-over'));
  }
}
