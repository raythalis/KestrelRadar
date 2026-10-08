# Design guidelines

The current visual and interaction rules for Kestrel Radar's product pages are here; for how to use the product, see the [user guide](../usage.en.md). The component showcase at `/style-lab` is available only in development and is not the information architecture of the product pages.

- [Foundation](foundation.en.md): the responsibilities of the current tokens and the layers of the design system.
- [Visual design](visual-design.en.md): current color, typography, spacing, layout, themes, and component usage.
- [Product pages](product-pages.en.md): page tasks, information hierarchy, and the boundary between product pages and component demos.
- [UX writing](ux-writing.en.md): self-explanatory interfaces, status copy, and error copy.
- [Fonts](fonts.en.md): font stacks, glyph assets, and maintenance.

`apps/web/src/design/v2/tokens.ts` is the sole implementation source for visual values; the consuming style layer is `apps/web/src/styles/v2.scss`. Design-process records from earlier stages remain in the local `.ai/records/` directory and are not public guidelines.
