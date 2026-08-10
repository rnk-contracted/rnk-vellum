# Changelog - RNK Vellum

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.12] - 2026-08-10

### Added
- **Description** free-text field in the header (replaces the old size-dropdown idea from the PDF).
- **Attacks & Abilities** section listing weapons, spells, and abilities for quick rolls.
- Cairn-style **numbered inventory slots** (`1 … STR`, min 10) with empty rows visible; drop onto a slot to assign it.

### Changed
- Background labels match commission feedback: **Talents** + **Traits** (Flaws box renamed to Traits). **Knowledge** always shown with them. Phobia and Effects retained.
- PC portrait is taller (~2× prior square) and stretches to the bottom of the header.
- Containers and Notepads open on **double-click** of the name (pencil still opens them). Standard items open on single click.
- README feature list updated to match actual UI behavior.

## [1.2.11] - 2026-08-10

### Added
- Flaws and Effects text fields on the actor sheet (persisted in vellum flag data).
- Client settings menu under Module Settings → **Open Settings** (portrait glow / blessing defaults).
- Handlebars `capitalize` helper for the item sheet type/category labels.

### Fixed
- Re-opening a container or notepad no longer throws (`bringToTop` → ApplicationV2 `bringToFront`).
- GM Hub glow/color saves no longer wipe per-actor blessing token count.
- GM Hub reuses a single window via `foundry.applications.instances` instead of spawning duplicates.
- GM Hub live CSS updates only affect that actor’s open sheet (`data-actor-id` scoping).
- Vellum item sheet now saves name, description, and image (FilePicker); description supports string or `{ value }` system shapes.
- Container `used` flag stores total slot cost (not item count).
- AC is read-only when the game system owns Armor Class, so edits are not silently overwritten.

### Changed
- Drag-reorder logic moved to `VellumSheetDrag.js` so sheet event code stays under the 500 LOC file cap.

## [1.2.10] - 2026-08-03

### Fixed
- Editing Max HP now actually persists. It previously only saved to an internal flag and was silently reverted on the next sheet re-render (e.g. right after editing Current HP) because the sheet always trusted the live system value for HP, and the system was never told about the edit. Max HP now syncs to the actor the same way Current HP already did.

## [1.2.9] - 2026-08-02

### Added
- Inventory rows for weapons, armor/shields, and spells now show computed roll stats beside their name — e.g. `1d4 +2` for a weapon, `AC 11 + DEX` or `+2 AC` for armor/shields, `DC 13` for a spell — read directly from the game system's own item data.
- Right-click context menu gained a **Vellum Settings** entry that always opens the Item Type / Category / Capacity configuration window, including for containers and notepads.

### Changed
- Items and containers now consume the number of inventory/container slots defined by the game system's own "Slots per item" field (e.g. Chain Mail, Plate Armor, Bastard Sword) instead of always counting as one slot.
- The pencil icon on inventory rows now opens the game system's native item sheet (the same "Details / Description" editor as right-click > Edit) instead of the Vellum item configuration window; name-click still opens Vellum's configuration window.
- Container capacity now defaults consistently to 6 slots everywhere it's read, instead of disagreeing between the container window and the item configuration sheet.

### Fixed
- A container could get permanently stuck with no way to change its Item Type back to standard or edit its capacity, because both the pencil and name-click always opened the container's contents window. Vellum Settings (above) now always provides a way in.

## [1.2.8] - 2026-07-17

### Changed
- HP now appears as a standard identity row directly beneath Level instead of under the character portrait.
- Container contents now use the same compact item presentation as the player inventory.

### Fixed
- Items can be dragged from containers back into the player inventory.
- Container slot counts are derived from actual contained items and no longer include stale or legacy entries.
- Attribute checks delegate to the game system's native stat-roll flow, with a generic roll fallback for other systems.
- All Vellum characters can use Shadowdark's native spell-casting flow even without a spellcasting class.

## [1.2.6] - 2026-06-19

### Changed
- Token glow now also applies to the character sheet portrait and deity portrait when enabled for an actor.
- The attributes block has been moved into the left panel above the background section to balance the sheet layout.
- Description and Subtitle were removed from the header, HP moved under Level, and XP now displays as `0/10` beside the level field.
- Editable fields now use a lighter fill so inputs stand out more clearly against the parchment background.

## [1.2.5] - 2026-06-17

### Fixed
- Weapon and spell roll buttons now use Shadowdark's native actor roll methods directly, matching the system's own attack and cast flow.
- Inventory capacity now blocks drops that would exceed the STR-based slot limit instead of allowing over-capacity stacks.
- Container items now support drag and drop into and out of the container sheet, with container membership staying in sync.

## [1.2.4] - 2026-06-06

### Fixed
- Container items now open their contents window when created or edited, and the container template can render slot numbers reliably.
- Spells now auto-classify as `spell`, do not consume inventory slots, and show the roll button again on the actor sheet.
- Weapon rolls now prefer the Shadowdark native attack flow before falling back, so they show the system's attack handling instead of a generic manual roll.

## [1.2.3] - 2026-06-06

### Fixed
- Bootstrap and settings init now load safely - settings are registered before `ready`, and glow vars fall back to defaults if a setting key is unavailable.
- Invalid quote tokens removed - the broken curly-quote string delimiters in `VellumSheetEvents.js` were replaced with normal JavaScript string literals so the module parses cleanly.

## [1.2.2] - 2026-05-29

### Fixed
- **Spells auto-categorize correctly** - items with `type === 'spell'` now map to the `spell` category on drop, making them weightless (no inventory slot consumed) and showing the roll button.
- **Equipping armor now updates AC** - the equip toggle now also writes `system.equipped = true/false` on the item document itself so Shadowdark recalculates AC from equipped armor + DEX modifier.
- **CON change no longer interferes with HP max** - HP max is derived by Shadowdark from CON + level/class and was being overwritten by our sync. We now only write `hp.value` (current HP) back to the system; `hp.max` is always read from the system.
- **Container opens on creation and edit** - clicking "+ Add -> Container" now opens the container sub-inventory window immediately instead of the item config sheet. The edit pencil on container rows also opens the container window.
- **Weapon rolls use Shadowdark's native attack dialog** - roll button now calls `item.rollAttack()` first (Shadowdark's method that shows the advantage/normal/disadvantage dialog with attack + conditional damage), falling back to `item.roll()` and `item.use()` for other systems.

---

## [1.2.1] - 2026-05-27

### Fixed
- **AC now reflects live Shadowdark value** - the sheet no longer attempts to write back to `system.attributes.ac`, which Shadowdark overwrites immediately as a derived value (base armor + DEX mod). AC on the shield always shows what the system computed.
- **Sheet re-renders on `updateActor`** - any open Vellum sheet now re-renders whenever the actor is updated (e.g. equipping armor changes AC, a system-side HP change), keeping all displayed values in sync without closing and reopening the sheet.
- **STR score change updates inventory max immediately** - stat score writes to `system.abilities.str.value` correctly so Shadowdark's derived values (inventory capacity, modifiers used in attack rolls) respond in real time.

---

## [1.2.0] - 2026-05-19

### Added
- **Shadowdark RPG native rolls** - weapon rolls delegate to the system's own `item.roll()` so Shadowdark dice chains, critical hits, and chat cards all work correctly.
- **Spell / ability manual roll path** - spells and abilities that have no native roll method now use a `1d20 + WIS` manual roll, ensuring dice always appear in chat.
- **`isRollable` inventory flag** - weapons, spells, abilities, and any item with a saved damage formula all show the roll button in the inventory row.
- **Weightless inventory categories** - spells and abilities are excluded from the 20-slot inventory count and displayed in a distinct gold-accented group.
- **Split Add -> dropdown** - the Add button now reveals an Item / Container / Notepad menu so the correct item type is created in one click.
- **Spell and Ability categories** in the VellumItemSheet category picker.

### Changed
- **Default sheet** - `VellumActorSheet` is now `makeDefault: true`; Vellum opens automatically for all actors without manual sheet switching.
- **Stat modifier display** - modifier is auto-computed from the score (`floor((score-10)/2)`) and shown as a read-only span; the editable modifier field is removed.
- **Item add / edit** - opening an item always opens `VellumItemSheet` (ApplicationV2) directly, eliminating Shadowdark `ItemSheetSD` V1 deprecation warnings.
- **Grid layout** - middle row simplified to AC Shield + Stats; the standalone Abilities column is removed.

### Fixed
- `try/catch` around `item.roll()` was silently swallowing weapon roll exceptions; removed so Shadowdark rolls fire correctly.
- `game.settings.get('core', 'rollMode')` removed from `toMessage()` call - was a potential throw point in Foundry v13/v14.
- Spell formula falling back to `'1d20'` default and weapon formula falling back to `'1d6'` default when no system or flag formula is present.

---

## [1.1.0] - 2026-05-17

### Added
- **Per-player blessing token count** - GM Hub now includes a 1 / 2 / 3 picker inside each actor's Blessing Tokens section. The count is stored as an actor flag and takes effect immediately on that player's sheet. Falls back to the global world setting if no per-actor value is set.

### Changed
- GM Hub blessing count control moved from a global world setting into per-actor flags so each player can have a different token count independently.
- `VellumActorSheet._prepareContext` reads actor flag `blessingCount` first, then falls back to the `blessingCount` world setting.

### Fixed
- `module.json` `compatibility` fields changed from integers to quoted strings to match Foundry v14 manifest spec.
- `languages` array corrected from object form to array-of-objects form per Foundry v14 spec.

---

## [1.0.0] - 2026-05-01

### Added
- Initial release.
- Parchment-styled system-agnostic actor sheet.
- Shield AC display, full stat block with rollable modifiers.
- Blessing tokens (3 toggleable circles).
- Dynamic abilities table with add / remove rows.
- 20-slot numbered inventory with drag-to-reorder groups.
- Container items - double-click opens sub-inventory window.
- Notepad items - double-click opens auto-saving note editor.
- Dual portrait slots (character + animal deity) with file picker.
- Background panel: Talents, Traits, Knowledge (drag-reorderable), Flaws, Phobia, Effects.
- GP current/max field and dedicated charm item slot.
- Token glow - per-actor PIXI glow effect on canvas tokens.
- GM Hub - per-actor glow color, blur, spread, blessing color, token glow toggle.
- Global settings app for default glow and blessing color.
- Auto-categorization of dropped items by system type and name.
- MIT license.
