# Changelog — RNK™ Vellum

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
