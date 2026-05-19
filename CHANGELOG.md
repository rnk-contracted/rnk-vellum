# Changelog — RNK™ Vellum

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-05-19

### Added
- **Shadowdark RPG native rolls** — weapon rolls delegate to the system's own `item.roll()` so Shadowdark dice chains, critical hits, and chat cards all work correctly.
- **Spell / ability manual roll path** — spells and abilities that have no native roll method now use a `1d20 + WIS` manual roll, ensuring dice always appear in chat.
- **`isRollable` inventory flag** — weapons, spells, abilities, and any item with a saved damage formula all show the roll button in the inventory row.
- **Weightless inventory categories** — spells and abilities are excluded from the 20-slot inventory count and displayed in a distinct gold-accented group.
- **Split Add ▾ dropdown** — the Add button now reveals an Item / Container / Notepad menu so the correct item type is created in one click.
- **Spell and Ability categories** in the VellumItemSheet category picker.

### Changed
- **Default sheet** — `VellumActorSheet` is now `makeDefault: true`; Vellum opens automatically for all actors without manual sheet switching.
- **Stat modifier display** — modifier is auto-computed from the score (`⌊(score−10)/2⌋`) and shown as a read-only span; the editable modifier field is removed.
- **Item add / edit** — opening an item always opens `VellumItemSheet` (ApplicationV2) directly, eliminating Shadowdark `ItemSheetSD` V1 deprecation warnings.
- **Grid layout** — middle row simplified to AC Shield + Stats; the standalone Abilities column is removed.

### Fixed
- `try/catch` around `item.roll()` was silently swallowing weapon roll exceptions; removed so Shadowdark rolls fire correctly.
- `game.settings.get('core', 'rollMode')` removed from `toMessage()` call — was a potential throw point in Foundry v13/v14.
- Spell formula falling back to `'1d20'` default and weapon formula falling back to `'1d6'` default when no system or flag formula is present.

---

## [1.1.0] — 2026-05-17

### Added
- **Per-player blessing token count** — GM Hub now includes a 1 / 2 / 3 picker inside each actor's Blessing Tokens section. The count is stored as an actor flag and takes effect immediately on that player's sheet. Falls back to the global world setting if no per-actor value is set.

### Changed
- GM Hub blessing count control moved from a global world setting into per-actor flags so each player can have a different token count independently.
- `VellumActorSheet._prepareContext` reads actor flag `blessingCount` first, then falls back to the `blessingCount` world setting.

### Fixed
- `module.json` `compatibility` fields changed from integers to quoted strings to match Foundry v14 manifest spec.
- `languages` array corrected from object form to array-of-objects form per Foundry v14 spec.

---

## [1.0.0] — 2026-05-01

### Added
- Initial release.
- Parchment-styled system-agnostic actor sheet.
- Shield AC display, full stat block with rollable modifiers.
- Blessing tokens (3 toggleable circles).
- Dynamic abilities table with add / remove rows.
- 20-slot numbered inventory with drag-to-reorder groups.
- Container items — double-click opens sub-inventory window.
- Notepad items — double-click opens auto-saving note editor.
- Dual portrait slots (character + animal deity) with file picker.
- Background panel: Talents, Traits, Knowledge (drag-reorderable), Flaws, Phobia, Effects.
- GP current/max field and dedicated charm item slot.
- Token glow — per-actor PIXI glow effect on canvas tokens.
- GM Hub — per-actor glow color, blur, spread, blessing color, token glow toggle.
- Global settings app for default glow and blessing color.
- Auto-categorization of dropped items by system type and name.
- MIT license.
