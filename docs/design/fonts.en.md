# Fonts

The interface uses **self-hosted Inter + JetBrains Mono + a subsetted icon font**.
Principle: **change only the font families**—do not change the font-size, line-height, or font-weight tiers.
Do **not** load a Chinese webfont; fall back to system Chinese fonts.

## Current setup

| Purpose | Font | File | Size |
| --- | --- | --- | --- |
| General UI (English, numbers, symbols) | Inter (variable) | `apps/web/src/assets/fonts/inter-variable-latin.woff2` | 48 KB |
| Code, logs, IP addresses, technical strings | JetBrains Mono (variable) | `apps/web/src/assets/fonts/jetbrains-mono-variable-latin.woff2` | 40 KB |
| Icons | Material Design Icons (subset; count is determined by the font asset manifest) | `apps/web/src/assets/fonts/materialdesignicons-subset.woff2` | About 5 KB |
| Chinese | System Chinese fonts (PingFang / Microsoft YaHei / Source Han, etc.) | — | 0 |

- `@font-face` is defined in `apps/web/src/styles/fonts.scss` (text fonts, `font-display: swap` and a `unicode-range` restricted to Latin) and `apps/web/src/styles/mdi.scss` (icon font, `font-display: block`).
- The font families sit at the head of the `--k2-font-sans` / `--k2-font-mono` stacks in `design/v2/tokens.ts`. The entire site consumes only those two variables.
- Files live under `apps/web/src/assets/`, not `public/`: builds give them content hashes, allowing long browser caching and automatically changing URLs when a font changes. In production, set `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`.
- For licenses and regeneration instructions, see `apps/web/src/assets/fonts/README.md` (Inter / JetBrains Mono = SIL OFL 1.1; icons = Apache-2.0 / Pictogrammers Free License; the full licenses are in the same directory).

## Rationale (measured on real builds)

Three font configurations were compared on the same build:

| Configuration | First-screen font requests | First-screen font transfer |
| --- | --- | --- |
| Inter + JB Mono (Latin) | 2 | 87 KB |
| Plus Noto Sans SC shards (`unicode-range`, 303 shards) | 19 | 1024 KB |
| Plus a variable Chinese subset (848 characters) | 3 | 277 KB |

- **The sharded option downloads another ~180 KB on each new page** (`/channels` +3 shards, `/models` +3 shards). After the subset is fetched once, it makes no more requests.
- `font-display: swap` did not block text in the measurement: when the font was intentionally delayed by 2 seconds, text appeared at 119 ms; with `block`, it appeared at 2182 ms.
- Fonts are independent of light/dark themes: switching themes generated 0 additional font requests.
- The largest font payload without subsetting is actually the **icon font**: full `@mdi/font` is 394 KB / 7448 icons, while the project uses only a subset. Subsetting brings it to about 5 KB and reduces its CSS from 408 KB to a few KB.

**No Chinese webfont is currently included** (see the table: shards cost 1 MB and even a subset costs 277 KB; system Chinese fonts cost nothing). If uniform Chinese glyphs across platforms become necessary, add one variable subset (≈ 190 KB for characters used by the current UI) and keep system Chinese fonts at the end of the fallback chain.

## Verification

- Unit tests: `apps/web/src/__tests__/fonts.spec.ts` (font files and stacks, `font-display`, and unchanged size/weight tiers) and `apps/web/src/__tests__/mdi-icons.spec.ts` (checks icons in source code and Vuetify's built-in icon set against the subset manifest, failing if any are missing).
- After a production build, inspect `dist/assets/`: expect 3 hashed `.woff2` files and no 394 KB icon font.
- In a real browser: general UI uses Inter, code/log areas use JetBrains Mono, Chinese uses system fonts, and icons are not blank. Switching between light and dark must not initiate another font request.

## Adding an icon

The subset manifest = `mdi-*` references in frontend source ∪ Vuetify's built-in icon set (`vuetify/lib/iconsets/mdi.js`).
After adding an icon, **rerun the generation command** in `apps/web/src/assets/fonts/README.md` or it will render blank; if you forget, `mdi-icons.spec.ts` reports exactly which icons are missing.
