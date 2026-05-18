/**
 * RNK™ Vellum — VellumTokenGlow.js
 * Applies a colored underglow to a character's token.
 * Uses GlowFilter when available; falls back to a blurred PIXI.Graphics
 * circle added directly to the token container behind the mesh.
 * Toggle stored as a per-actor flag.
 * © 2026 RNK Enterprise. All rights reserved. See LICENSE.
 */

import { MODULE_ID } from './VellumDataModel.js';

const FLAG_ENABLED  = 'tokenGlow';
const GLOW_CHILD_ID = '_vellumGlowChild';

/** GlowFilter if the pixi-filters library happens to be loaded. */
function getGlowFilter() {
  return globalThis.PIXI?.filters?.GlowFilter ?? globalThis.GlowFilter ?? null;
}

/** Parse hex color string → PIXI numeric color. */
function toPixiColor(hex) {
  try { return Color.from(hex).valueOf(); }
  catch (_) { return 0xc8a020; }
}

/** Read current glow settings with fallbacks. */
function readSettings() {
  let color = '#c8a020', blur = 10, spread = 4;
  try {
    color  = game.settings.get(MODULE_ID, 'glowColor')  || color;
    blur   = Number(game.settings.get(MODULE_ID, 'glowBlur'))   || blur;
    spread = Number(game.settings.get(MODULE_ID, 'glowSpread')) || spread;
  } catch (_) {}
  return { color, blur, spread };
}

/** Remove any existing vellum glow from the token. */
function clearGlow(token) {
  if (!token) return;

  // Remove graphics child
  const existing = token[GLOW_CHILD_ID];
  if (existing) {
    try { token.removeChild(existing); existing.destroy({ children: true }); } catch (_) {}
    delete token[GLOW_CHILD_ID];
  }

  // Remove any filter-based glow from the mesh
  const mesh = token.mesh ?? token.icon ?? null;
  if (mesh?.filters?.length) {
    const kept = mesh.filters.filter(f => !f._vellumGlow);
    mesh.filters = kept.length ? kept : null;
  }
}

/** Apply the glow to a token. */
function applyGlow(token) {
  if (!token) return;
  clearGlow(token);

  const { color, blur, spread } = readSettings();
  const GlowFilter = getGlowFilter();

  if (GlowFilter) {
    // ── Native GlowFilter path ──────────────────────────────────────────────
    const mesh = token.mesh ?? token.icon;
    if (!mesh) return;
    const f = new GlowFilter({
      distance:      blur,
      outerStrength: Math.max(1, spread * 0.8),
      innerStrength: Math.max(0.2, spread * 0.2),
      color:         toPixiColor(color),
      quality:       0.3
    });
    f._vellumGlow = true;
    mesh.filters = [...(mesh.filters ?? []), f];

  } else {
    // ── Fallback: blurred Graphics circle added to token container ──────────
    // Read dimensions — prefer direct pixel properties, fall back to document
    const gridSize = canvas?.grid?.size ?? 100;
    const w = (token.w > 0 ? token.w : null)
           ?? ((token.document?.width  ?? 1) * gridSize);
    const h = (token.h > 0 ? token.h : null)
           ?? ((token.document?.height ?? 1) * gridSize);

    const gfx = new PIXI.Graphics();
    const rx  = w * 0.5 + spread * 4;
    const ry  = h * 0.5 + spread * 4;

    gfx.beginFill(toPixiColor(color), 0.85);
    gfx.drawEllipse(w / 2, h / 2, rx, ry);
    gfx.endFill();
    gfx.filters = [new PIXI.BlurFilter(blur + spread * 2, 8)];
    // Do NOT set zIndex — rely solely on insertion at index 0 for render order
    // (PIXI renders children in array order when sortableChildren is false)

    // Insert at position 0 so it renders behind all other token children
    token.addChildAt(gfx, 0);
    token[GLOW_CHILD_ID] = gfx;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isGlowEnabled(token) {
  return token?.actor?.getFlag(MODULE_ID, FLAG_ENABLED) === true;
}

export async function toggleTokenGlow(actor) {
  const next = !(actor.getFlag(MODULE_ID, FLAG_ENABLED) ?? false);
  await actor.setFlag(MODULE_ID, FLAG_ENABLED, next);
  refreshActorTokens(actor);
  return next;
}

export function refreshActorTokens(actor) {
  if (!canvas?.tokens?.placeables) return;
  for (const token of canvas.tokens.placeables) {
    if (token.actor?.id === actor.id) refreshToken(token);
  }
}

export function refreshToken(token) {
  if (isGlowEnabled(token)) {
    applyGlow(token);
  } else {
    clearGlow(token);
  }
}

export function refreshAllTokens() {
  if (!canvas?.tokens?.placeables) return;
  for (const token of canvas.tokens.placeables) refreshToken(token);
}

export function reapplyAllGlows() {
  if (!canvas?.tokens?.placeables) return;
  for (const token of canvas.tokens.placeables) {
    if (isGlowEnabled(token)) applyGlow(token);
  }
}
