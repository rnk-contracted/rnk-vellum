# RNK™ Vellum

**Version:** 1.2.12
**Compatibility:** Foundry VTT v13 – v14
**System:** System agnostic (Shadowdark / Cairn optimized)
**Author:** The Curator — RNK Enterprise
**Patreon:** [patreon.com/RagNaroks](https://www.patreon.com/RagNaroks)
**Discord:** Odinn1982

---

## Screenshots

![RNK Vellum Sheet](RNK%20Vellum%20Sheet.jpeg)

![RNK Vellum GM Hub Settings](RNK%20Vellum%20GM%20Hub%20Settings.jpeg)

---

## Overview

RNK™ Vellum is a system-agnostic character sheet module for Foundry VTT built around a
Shadowdark / Cairn aesthetic. Parchment tones, dark ink borders, and a clean layout keep
everything a player needs on one screen — no tabs, no clutter.

---

## Features

- **Parchment aesthetic** — aged parchment tones, dark ink, stark borders matching Shadowdark and Cairn visual style
- **Shield AC** — Armor Class rendered inside an SVG shield icon
- **Blessing tokens** — Toggleable circles (spent / restored) used as Luck Tokens or similar per-session resources; count is set per-player by the GM
- **Full stat block** — STR / DEX / CON / INT / WIS / CHA with score, modifier, and rollable dice buttons
- **Description** — free-text character description in the header (not a size dropdown)
- **Attacks & Abilities** — weapons, spells, and abilities listed for quick rolls
- **Background panel** — **Talents**, **Traits**, and **Knowledge** (always shown, drag-to-reorder item lists); plus Phobia and Effects text areas
- **GP and Charm slot** — Gold with current/max pair and a dedicated single charm item slot
- **Numbered inventory** — Cairn-style slots `1 … N` where N is based on STR (minimum 10); empty slots stay visible; drop items onto a slot number to place them
- **Container items** — **Double-click** a container name to open a dedicated sub-inventory window (pencil also works)
- **Notepad items** — **Double-click** a Notepad name to open the note editor; notes auto-save as you type
- **Dual portrait slots** — Large character portrait (full header height) and Animal Deity portrait, both clickable to browse for an image
- **Token glow** — Per-actor PIXI glow effect on canvas tokens, toggled from the sheet header or GM Hub
- **GM Hub** — Scene control button opens a per-actor panel where the GM can set glow color, blur, spread, blessing token color, blessing token count (1 / 2 / 3 per player), and toggle token glow independently for each actor

---

## Installation

Drop the `rnk-vellum` folder into your Foundry `Data/modules/` directory and enable it in
the module manager, or install via manifest URL.

---

## Using the Sheet

1. Open any Actor.
2. Click the sheet selector at the top of the actor window.
3. Choose **RNK™ Vellum**.

---

## Item Types

Set an item's **Item Type** in the Vellum item sheet header:

| Type | Behavior |
|---|---|
| Standard | Normal inventory entry |
| Container | Double-click opens a sub-inventory window |
| Notepad | Double-click opens a dedicated note editor |

Items dropped from the sidebar are auto-categorized by system type and name.

---

## Blessing Tokens

The circle buttons near the top of the sheet represent Blessing tokens — mechanically
similar to Luck Tokens in Shadowdark. Click to spend (darken) or restore (glow). The GM
sets each player's token count (1, 2, or 3) independently from the GM Hub.

---

## GM Hub

Click the feather icon in the scene controls (GM only) to open the GM Hub. Each actor
using the Vellum sheet gets a collapsible card with:

- **Portrait Glow** — color, blur radius, spread
- **Blessing Tokens** — token color, token count (1 / 2 / 3)
- **Token Glow** — enable / disable the canvas PIXI glow for that actor's tokens

Settings are stored as actor flags and take effect immediately on open sheets and tokens.

---

## License

MIT — see [LICENSE](LICENSE).
