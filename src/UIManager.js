/**
 * RNK™ Vellum — UIManager.js
 * Singleton window registry. Prevents duplicate sub-windows and routes
 * open/close/focus for ContainerWindow and NotepadWindow.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

const _registry = new Map();

export class UIManager {

  /**
   * Open (or focus) a ContainerWindow for the given item.
   * @param {Item}  item
   * @param {Actor} actor
   */
  static async openContainer(item, actor) {
    const key = `container:${item.id}`;

    if (_registry.has(key)) {
      _registry.get(key).bringToTop();
      return;
    }

    const { ContainerWindow } = await import('./ContainerWindow.js');
    const win = new ContainerWindow(item, actor, key);
    _registry.set(key, win);
    win.render(true);
  }

  /**
   * Open (or focus) a NotepadWindow for the given item.
   * @param {Item}  item
   * @param {Actor} actor
   */
  static async openNotepad(item, actor) {
    const key = `notepad:${item.id}`;

    if (_registry.has(key)) {
      _registry.get(key).bringToTop();
      return;
    }

    const { NotepadWindow } = await import('./NotepadWindow.js');
    const win = new NotepadWindow(item, actor, key);
    _registry.set(key, win);
    win.render(true);
  }

  /**
   * Remove a window from the registry (called on close).
   * @param {string} key
   */
  static deregister(key) {
    _registry.delete(key);
  }

  /**
   * Close all open vellum sub-windows (e.g. when actor sheet closes).
   */
  static closeAll() {
    for (const [key, win] of _registry.entries()) {
      win.close({ force: true });
      _registry.delete(key);
    }
  }
}
