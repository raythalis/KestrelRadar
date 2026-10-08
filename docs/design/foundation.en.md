# Foundation

Kestrel Radar's Foundation comprises the base values and semantic roles of the design system, not a separate legacy theme. The sole current token source is `apps/web/src/design/v2/tokens.ts`. It defines light and dark colors, typography, spacing, radii, shadows, density, layout, icons, motion, and themes. Components consume these values through the generated `--k2-*` variables and the Vuetify theme derived from the same source.

- **Token layer**: Defines reusable base values and semantic roles; do not invent a global variable for a local dimension of one component.
- **Component layer**: App components and business components use tokens to express appearance and state; express shared state only once and keep dangerous actions on a distinct visual tier.
- **Page layer**: Organizes data, user tasks, and information hierarchy; product pages must not directly copy the component showcase. See [Product pages](product-pages.en.md).
- **Copy and assets**: See [UX writing](ux-writing.en.md) for copy constraints and [Fonts](fonts.en.md) for fonts and icons.

See [Visual design](visual-design.en.md) for specific visual rules and current layout. The code remains the source of truth for numeric values. References in the old Foundation to `design/tokens/` and `/design` are obsolete and are not carried over here.
