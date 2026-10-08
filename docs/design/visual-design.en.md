# Visual design

This document describes the design language used by the current product; it does not record test counts or preview-fixture inventories from earlier stages. For exact values, consult `apps/web/src/design/v2/tokens.ts`; page styles live in `apps/web/src/styles/v2.scss`. Do not duplicate a complete set of token values across documents.

## Layers and responsibilities

Foundation tokens → Vuetify theme and CSS variables → App/business components → product pages. A single set of V2 tokens defines and generates `--k2-*` values for color, typography, spacing, radii, shadows, density, icon sizes, and motion; Vuetify theme colors derive from it too. Legacy `--k-*` names exist only for compatibility with existing components, not as a second color source. Components consume semantic variables; pages own user tasks, data, and layout. Do not copy the component showcase's structure into product pages.

## Visual language

- Light and dark themes share semantic roles; distinguish backgrounds, card surfaces, text, and borders in layers. Use the primary brand color for primary actions and emphasis; use success, warning, danger, and information colors for their respective meanings. Never convey state through color alone.
- For small text, favor softer backgrounds and darker text to preserve contrast. Selected text, short status labels, and icon containers each contribute to information hierarchy; avoid stacking multiple emphases on the same state.
- Use the existing type and weight scales. Chinese falls back to system fonts; reserve monospaced type for technical strings. See [Fonts](fonts.en.md) for font and icon assets.
- Use token-defined spacing and density for pages and cards. Keep dimensions specific to one component inside that component; do not add a global token for one page. Dangerous actions must have a clear visual hierarchy relative to ordinary actions.
- The theme can be set to Light, Dark, or System. There is currently no user-selectable primary-color palette. Overlays such as dialogs must follow the same theme when switching between light and dark.

## Page layout and responsiveness

`AppShell` owns the shell sidebar and navigation; business pages use the `.k2-page` family. **In the current code**, the default width tier is 1120px and the wide tier is 1440px. All five main product pages use the wide tier, together with their containers' own padding. The two-column activity area collapses to one column at `max-width: 1183px` on narrow screens. Consult the rules where each breakpoint is used; do not mistake general token breakpoints for a universal collapse point for every component. Decide page structure from the task first; see [Product pages](product-pages.en.md).

## Comparison and verification

The development-only `/style-lab` shows tokens and component states but is absent from production builds. When changing visual rules, check product pages and both light and dark themes as well as the component itself. Follow the self-explanatory interface principle in [UX writing](ux-writing.en.md). Old counts and fixture records remain in local working materials, not in these current guidelines.
