# nextchapter shared foundations — Phase 1

October 11, 2026. Implements foundations only; component and application migrations remain deferred.

## Sources and implementation mapping

Read the [October 10 audit](nextchapter-design-system-audit.md) and current consumers before editing. Live Figma inspection retrieved 30 color primitives, all 50 Theme variables and both mode aliases, and all 15 current text styles. Sources: [color specification](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=45-4), [updated typography](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=51-3). The [WIP components](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=102-10517) were inspected for context only.

**A — approved:** tables below use actual variable values/aliases and current text styles. Several descriptions and older swatch labels are stale; these were not used to assign values. Two neutral values have fractional sRGB channels, retained as decimal RGB rather than rounded hex. Primary is soft yellow; secondary is lavender. Names follow the live collections.

**B — compatibility:** preserve legacy coral/cyan/teal/gold primitives and alpha values, neutral 850, 4/8/12/16px spacing, existing 4/8/10px named radii and 10px panel radius. Existing radii do not claim to implement Figma's similarly named 2/6/8px values. Add only approved default radius 8px. Existing component spacing, type sizes, line heights, weights, motion and geometry remain local. Font loading uses the existing Google Fonts mechanism, with DM Serif Display 400, Inter 400/500/600 and IBM Plex Mono 400. Legacy 300 requests resolve to Inter Regular; legacy serif bold requests retain browser synthesis pending typography migration.

**C — unspecified/deferred:** no approved shared motion or general border-width collection was retrieved. Preserve existing durations and borders; do not invent new scales. Figma specifies a 2px outer focus ring and 2px local-surface gap; apply these to existing outline treatments only. Builder keyboard/label fixes remain deferred.

### Primitives

All are independent of theme. Existing neutral tokens change; other Figma primitives are new.

| Figma variable | Approved CSS value | Existing token | Proposed token | Status |
| --- | --- | --- | --- | --- |
| primary/200 | `#F8E1B6` | — | `--nc-primary-200` | New |
| primary/300 | `#F1CC88` | — | `--nc-primary-300` | New |
| primary/400 | `#E5AE54` | — | `--nc-primary-400` | New |
| secondary/100 | `#EEE9FD` | — | `--nc-secondary-100` | New |
| secondary/200 | `#D7CDFB` | — | `--nc-secondary-200` | New |
| secondary/300 | `#B3A5F5` | — | `--nc-secondary-300` | New |
| secondary/400 | `#9782EB` | — | `--nc-secondary-400` | New |
| secondary/700 | `#523394` | — | `--nc-secondary-700` | New |
| secondary/900 | `#35245B` | — | `--nc-secondary-900` | New |
| neutral/50 | `#FFFFFF` | `--nc-neutral-50` | `--nc-neutral-50` | Changed |
| neutral/100 | `#FAF9F7` | `--nc-neutral-100` | `--nc-neutral-100` | Changed |
| neutral/200 | `#EFEBE7` | `--nc-neutral-200` | `--nc-neutral-200` | Changed |
| neutral/300 | `rgb(212.1055609 208.48800302 219.91198361)` | `--nc-neutral-300` | `--nc-neutral-300` | Changed |
| neutral/400 | `rgb(160.02370119 152.14999169 170.85000426)` | `--nc-neutral-400` | `--nc-neutral-400` | Changed |
| neutral/500 | `#837A90` | `--nc-neutral-500` | `--nc-neutral-500` | Changed |
| neutral/600 | `#68616F` | `--nc-neutral-600` | `--nc-neutral-600` | Changed |
| neutral/700 | `#504759` | `--nc-neutral-700` | `--nc-neutral-700` | Changed |
| neutral/800 | `#352D40` | `--nc-neutral-800` | `--nc-neutral-800` | Changed |
| neutral/900 | `#231D2B` | `--nc-neutral-900` | `--nc-neutral-900` | Changed |
| neutral/950 | `#15111B` | `--nc-neutral-950` | `--nc-neutral-950` | Changed |
| peach/300 | `#FFAB8D` | — | `--nc-peach-300` | New |
| success/50 | `#EFFAF3` | — | `--nc-success-50` | New |
| success/300 | `#87CFA5` | — | `--nc-success-300` | New |
| success/700 | `#195E3D` | — | `--nc-success-700` | New |
| danger/50 | `#FFF1F4` | — | `--nc-danger-50` | New |
| danger/300 | `#F79BB3` | — | `--nc-danger-300` | New |
| danger/700 | `#9B1F43` | — | `--nc-danger-700` | New |
| warning/50 | `#FFF7ED` | — | `--nc-warning-50` | New |
| warning/300 | `#FDBA74` | — | `--nc-warning-300` | New |
| warning/800 | `#9A3412` | — | `--nc-warning-800` | New |

### Semantic modes

Tokens use the Figma path with slashes replaced by hyphens. Aliases listed here are Figma variable names, not approximated colors. Dark remains the default; Light remains `body.light`. Semantics and compatibility aliases are repeated on the theme element so nested aliases resolve in the active mode.

| Figma role | Light alias | Dark alias | Existing token | Proposed token | Status |
| --- | --- | --- | --- | --- | --- |
| background/page | neutral/100 | neutral/950 | — | `--nc-background-page` | New |
| surface/default | neutral/50 | neutral/900 | — | `--nc-surface-default` | New |
| surface/raised | neutral/50 | neutral/800 | `--nc-surface-raised` | `--nc-surface-raised` | Changed |
| surface/sunken | neutral/200 | neutral/950 | — | `--nc-surface-sunken` | New |
| border/subtle | neutral/300 | neutral/700 | `--nc-border-subtle` | `--nc-border-subtle` | Changed |
| border/control | neutral/500 | neutral/400 | `--nc-border-control` | `--nc-border-control` | Changed |
| text/primary | neutral/900 | neutral/100 | `--nc-text-primary` | `--nc-text-primary` | Changed |
| text/secondary | neutral/700 | neutral/200 | `--nc-text-secondary` | `--nc-text-secondary` | Changed |
| text/muted | neutral/600 | neutral/400 | — | `--nc-text-muted` | New |
| action/primary/bg | primary/200 | primary/200 | — | `--nc-action-primary-bg` | New |
| action/primary/fg | neutral/900 | neutral/900 | — | `--nc-action-primary-fg` | New |
| action/primary/hover | primary/300 | primary/300 | — | `--nc-action-primary-hover` | New |
| action/primary/pressed | primary/400 | primary/400 | — | `--nc-action-primary-pressed` | New |
| action/primary/border | neutral/700 | neutral/700 | — | `--nc-action-primary-border` | New |
| action/secondary/bg | secondary/200 | secondary/200 | — | `--nc-action-secondary-bg` | New |
| action/secondary/fg | neutral/900 | neutral/900 | — | `--nc-action-secondary-fg` | New |
| action/secondary/hover | secondary/300 | secondary/300 | — | `--nc-action-secondary-hover` | New |
| action/secondary/pressed | secondary/400 | secondary/400 | — | `--nc-action-secondary-pressed` | New |
| action/secondary/border | secondary/700 | secondary/700 | — | `--nc-action-secondary-border` | New |
| link/default | secondary/700 | secondary/200 | — | `--nc-link-default` | New |
| link/hover | secondary/700 | secondary/100 | — | `--nc-link-hover` | New |
| focus/ring | secondary/400 | secondary/300 | — | `--nc-focus-ring` | New |
| selection/bg | secondary/100 | secondary/900 | — | `--nc-selection-bg` | New |
| selection/fg | secondary/700 | secondary/100 | — | `--nc-selection-fg` | New |
| selection/border | secondary/700 | secondary/300 | — | `--nc-selection-border` | New |
| action/disabled/bg | neutral/200 | neutral/800 | — | `--nc-action-disabled-bg` | New |
| action/disabled/fg | neutral/500 | neutral/400 | — | `--nc-action-disabled-fg` | New |
| supporting/bg | peach/300 | peach/300 | — | `--nc-supporting-bg` | New |
| supporting/fg | neutral/900 | neutral/900 | — | `--nc-supporting-fg` | New |
| success/fg | success/700 | success/300 | — | `--nc-success-fg` | New |
| success/bg | success/50 | neutral/900 | `--nc-success-bg` | `--nc-success-bg` | Changed |
| success/border | success/700 | success/300 | — | `--nc-success-border` | New |
| danger/fg | danger/700 | danger/300 | — | `--nc-danger-fg` | New |
| danger/bg | danger/50 | neutral/900 | — | `--nc-danger-bg` | New |
| danger/border | danger/700 | danger/300 | — | `--nc-danger-border` | New |
| warning/fg | warning/800 | warning/300 | — | `--nc-warning-fg` | New |
| warning/bg | warning/50 | neutral/900 | `--nc-warning-bg` | `--nc-warning-bg` | Changed |
| warning/border | warning/800 | warning/300 | `--nc-warning-border` | `--nc-warning-border` | Changed |
| text/placeholder | neutral/500 | neutral/500 | — | `--nc-text-placeholder` | New |
| input/bg | neutral/100 | neutral/950 | — | `--nc-input-bg` | New |
| input/hover | neutral/200 | neutral/800 | — | `--nc-input-hover` | New |
| input/border | border/control | border/subtle | — | `--nc-input-border` | New |
| loading/fg | secondary/700 | primary/200 | — | `--nc-loading-fg` | New |
| loading/bg | neutral/200 | neutral/700 | — | `--nc-loading-bg` | New |
| info/fg | neutral/950 | secondary/300 | — | `--nc-info-fg` | New |
| info/bg | secondary/100 | neutral/900 | — | `--nc-info-bg` | New |
| info/border | secondary/700 | secondary/300 | — | `--nc-info-border` | New |
| action/tertiary/bg | surface/default at 0% opacity | surface/default at 0% opacity | — | `--nc-action-tertiary-bg` | New |
| action/tertiary/fg | secondary/700 | secondary/400 | — | `--nc-action-tertiary-fg` | New |
| action/tertiary/border | border/subtle | border/subtle | — | `--nc-action-tertiary-border` | New |

Transparent tertiary backgrounds serialize as `transparent`, equivalent to the live surface/default alias at zero opacity in both modes.

### Typography

New roles are foundations, not automatically applied to existing headings or components. Each prefix supplies `-family`, `-size`, `-line-height` and `-weight`; all styles use zero tracking via `--nc-type-letter-spacing: 0`. `--nc-font-serif` and `--nc-font-sans` change in place; `--nc-font-mono` is new. UI Title retains Figma's precise numeric size rather than rounding it to the prompt's 21.33px.

| Figma style | Family | Size / line height (px) | Weight | New CSS prefix |
| --- | --- | --- | --- | --- |
| Type/Display | DM Serif Display | 50 / 64 | 400 | `--nc-type-display` |
| Type/Heading/H1 | DM Serif Display | 38 / 48 | 400 | `--nc-type-h1` |
| Type/Heading/H2 | DM Serif Display | 28 / 36 | 400 | `--nc-type-h2` |
| Type/Heading/H3 | DM Serif Display | 21 / 32 | 400 | `--nc-type-h3` |
| Type/Heading/H4 | DM Serif Display | 16 / 24 | 400 | `--nc-type-h4` |
| Type/Body/Large | Inter | 21 / 32 | 400 | `--nc-type-body-large` |
| Type/Body/Default | Inter | 16 / 24 | 400 | `--nc-type-body-default` |
| Type/Body/Small | Inter | 12 / 20 | 400 | `--nc-type-body-small` |
| Type/Caption | Inter | 12 / 16 | 400 | `--nc-type-caption` |
| Type/UI/Title | Inter | 21.33333396911621 / 28 | 600 | `--nc-type-ui-title` |
| Type/UI/Label | Inter | 16 / 24 | 500 | `--nc-type-ui-label` |
| Type/UI/Button | Inter | 16 / 16 | 500 | `--nc-type-ui-button` |
| Type/UI/Button Sm | Inter | 12 / 12 | 500 | `--nc-type-ui-button-small` |
| Type/UI/Badge | Inter | 12 / 20 | 500 | `--nc-type-ui-badge` |
| Type/Meta | IBM Plex Mono | 12 / 16 | 400 | `--nc-type-meta` |

### Other dimensions

| Figma definition | Approved value | Existing / proposed CSS token | Status |
| --- | --- | --- | --- |
| spacing/1 | 4px | `--nc-space-1` | Unchanged |
| spacing/2 | 8px | `--nc-space-2` | Unchanged |
| spacing/3 | 12px | `--nc-space-3` | Unchanged |
| spacing/4 | 16px | `--nc-space-4` | Unchanged |
| radius/default | 8px | `--nc-radius-default` | New |
| Focus guidance: outer ring | 2px | `--nc-focus-width` | New token; existing width preserved |
| Focus guidance: local-surface gap | 2px | `--nc-focus-offset` | New token; existing 2/3/4px outlines align to approved 2px |

Other spacing/radius collection members are deferred rather than imported as unused scales. Existing named radius tokens remain compatibility values as explained in category B.

### Existing aliases and minimal compatibility changes

| Existing token | Approved role / preservation |
| --- | --- |
| `--nc-surface-page` | background/page |
| `--nc-surface-raised` | surface/raised, exact live mapping |
| `--nc-surface-inset` | surface/sunken |
| `--nc-text-tertiary` | text/muted |
| `--nc-accent` | link/default; readable interactive text |
| `--nc-accent-bg` / `--nc-accent-border` | selection/bg / selection/border |
| `--nc-success` / `--nc-warning` / `--nc-error` | success/fg / warning/fg / danger/fg |
| `--nc-radius-panel` | legacy 10px, unchanged |

App aliases stay on `:root, body`, including Builder's tertiary `--muted` and Tracker's secondary `--muted`. Primary and revision button fills/labels use action/primary/bg and fg explicitly: the old accent could not safely represent both pale fills and readable links. Tracker error text uses danger/fg. Existing outlines use focus/ring and the approved width/gap; no new keyboard behaviors or component variants. Native controls inherit dark/light color-scheme from the foundation; theme storage and navigation logic remain unchanged.

## Contrast assessment

Calculated from the live, unrounded sRGB values using relative luminance. Normal-text threshold is 4.5:1, large text 3:1, and required non-text indicators generally 3:1; see [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Values below are displayed to two decimals, but pass/fail comparisons use unrounded ratios. “Neutral surfaces” reports the minimum over page, default, raised and sunken surfaces. These calculations are not a complete WCAG audit.

| Combination | Light | Dark | Threshold | Result |
| --- | --- | --- | --- | --- |
| text/primary on neutral surfaces | 13.81:1 | 12.47:1 | 4.5:1 | Pass |
| text/secondary on neutral surfaces | 7.42:1 | 11.06:1 | 4.5:1 | Pass |
| text/muted on neutral surfaces | 5.02:1 | 4.74:1 | 4.5:1 | Pass |
| link/default on neutral surfaces | 7.84:1 | 8.76:1 | 4.5:1 | Pass |
| link/hover on neutral surfaces | 7.84:1 | 11.06:1 | 4.5:1 | Pass |
| focus/ring on neutral surfaces | 2.64:1 | 6.01:1 | 3:1 | Light below threshold |
| border/control on neutral surfaces | 3.44:1 | 4.74:1 | 3:1 | Pass |
| border/subtle on neutral surfaces | 1.27:1 | 1.49:1 | 3:1 | Both below threshold |
| action/tertiary/fg on neutral surfaces | 7.84:1 | 4.19:1 | 4.5:1 | Dark below threshold |
| action/primary/fg on bg | 12.82:1 | 12.82:1 | 4.5:1 | Pass |
| action/primary/fg on hover | 10.71:1 | 10.71:1 | 4.5:1 | Pass |
| action/primary/fg on pressed | 8.20:1 | 8.20:1 | 4.5:1 | Pass |
| action/secondary/fg on bg | 10.93:1 | 10.93:1 | 4.5:1 | Pass |
| action/secondary/fg on hover | 7.50:1 | 7.50:1 | 4.5:1 | Pass |
| action/secondary/fg on pressed | 5.23:1 | 5.23:1 | 4.5:1 | Pass |
| selection/fg on selection/bg | 7.84:1 | 11.39:1 | 4.5:1 | Pass |
| supporting/fg on supporting/bg | 8.94:1 | 8.94:1 | 4.5:1 | Pass |
| success/fg on success/bg | 7.25:1 | 8.97:1 | 4.5:1 | Pass |
| danger/fg on danger/bg | 7.17:1 | 8.03:1 | 4.5:1 | Pass |
| warning/fg on warning/bg | 6.88:1 | 9.71:1 | 4.5:1 | Pass |
| info/fg on info/bg | 15.70:1 | 7.50:1 | 4.5:1 | Pass |
| text/placeholder on input/bg | 3.87:1 | 4.57:1 | 4.5:1 | Light below threshold |
| input/border on input/bg | 3.87:1 | 2.12:1 | 3:1 | Dark below threshold |
| text/placeholder on input/hover | 3.44:1 | 3.22:1 | 4.5:1 | Both below threshold |
| input/border on input/hover | 3.44:1 | 1.49:1 | 3:1 | Dark below threshold |


### Unresolved mappings and recommended design options

These are approval options for a later Figma adjustment, not replacements made in code:

- **Light focus/ring:** secondary/400 measures 2.98:1 on background/page and 2.64:1 on surface/sunken. Consider secondary/700 (minimum 7.84:1), or approve a stronger ring design/color across all surfaces. Header outlines currently expose the 2.98:1 page combination.
- **Placeholder:** neutral/500 is 3.87:1 on the light input background and 3.44:1 on its hover background; dark hover is 3.22:1. Consider text/muted per mode (Light minimum 5.02:1; Dark 4.74:1). Existing Builder placeholders already use its tertiary alias rather than the new placeholder role; unused role definitions are not automatically applied.
- **Dark input/border:** border/subtle is 2.12:1 on input/bg and 1.49:1 on input/hover. Consider border/control (minimum 4.74:1) when boundaries are necessary. Current legacy inputs already consume border/control; the canonical input/border role is retained exactly for future migration.
- **Dark tertiary labels:** secondary/400 is 4.19:1 on surface/raised. Consider secondary/300 (6.01:1) for normal-sized labels there, or constrain the original role to backgrounds where it passes. No WIP tertiary button variant was implemented.
- **Subtle/tertiary borders:** minima 1.27:1 Light / 1.49:1 Dark. Keep them decorative; use an approved control boundary role for required boundaries. Dark primary/secondary button border strokes alone also fall below 3:1 against some surfaces (1.49:1 / 1.41:1 minima), but the filled buttons have strongly contrasting silhouettes; a low-contrast stroke alone is not a blanket failure of those buttons.

Existing app hover opacity, selected chips, error callouts and native controls retain local component behavior; the table evaluates approved foundation pairs, not every rendered interaction state. Screen-reader, zoom/reflow and browser-specific accessibility checks remain future work.

## Files changed

| File | Purpose |
| --- | --- |
| [tokens.css](../tools/shared/tokens.css) | Live primitives, 50 semantic roles in both modes, 15 type roles, families, focus dimensions, native color scheme and compatibility aliases |
| [Builder](../tools/resume-tailor.html) | Approved font loading; existing primary/revision fill-label pairs and link outlines consume dedicated roles |
| [Tracker entry](../tools/prospect-tracker/index.html) | Approved font loading |
| [Career Radar placeholder](../tools/career-radar.html) | Approved font loading |
| [Tracker styles](../tools/prospect-tracker/styles.css) | Existing primary fill/label/border, outline and error color compatibility |
| [navigation.css](../tools/shared/navigation.css) | Existing outline uses dedicated focus color and approved width/gap |
| [Milestone 1 report](shared-design-tokens.md) | Mark the earlier palette/font snapshot as historical and link to the current foundations |
| This report | Source/mode/type mapping, preserved/deferred values, measured contrast, verification and limitations |

## Verification

- Static verification against the retrieved live data: all 30 primitive values within 1e-7 normalized RGB tolerance (float32 byte-color conversion), all 100 semantic mode mappings, all 15 style family/size/line-height/weight definitions and zero tracking. No duplicate declarations in a scope, unresolved references or circular references. Repeated dark/light definitions are intentional mode overrides.
- Headless Chrome, isolated profile, synthetic local PostgreSQL/Supabase fixture only: all three apps at 1280×900 and 390×844 in both themes. Verified all 50 computed semantic roles per app/mode, local alias resolution, actual loading of all three fonts and approved weights, inherited native color scheme, 2px focus outline/gap, no root horizontal overflow, saved preference after reload, active navigation and GitHub Pages `/career-context/` relative URLs. Reviewed screenshots of Builder in both themes, Tracker desktop/mobile and the placeholder mobile. Board's intentional internal horizontal scroll remains intact.
- Theme switching by keyboard, navigation between apps and storage synchronization across already-open tabs passed. Synthetic authentication/logout, deep-link reload, prospect edit/save, status transition/history, ingestion preview/save/cancel and duplicate detection passed. Unsaved-draft navigation confirmation passed for decline and accept without writes. No hosted data was read or written. Navigation/theme actions added no fixture writes; deliberate synthetic saves/history worked normally.
- Real detail-to-Builder handoff passed with a 375k+ complete description, repeat sends, existing-draft confirmation decline/accept, missing optional fields, expired/malformed/missing payloads, blocked storage, blocked popup and direct standalone navigation. The handoff added no fixture database writes.
- Builder streamed generation and revision with mocked API responses, résumé/cover-letter previews and actual download package passed. ZIP contained two PDFs, three DOCX files and README; PDF signatures and DOCX internal structures were verified. API generation quality and hosted services were not tested. Builder markup/scripts, including preview templates and PDF/DOCX definitions, are byte-for-byte unchanged from HEAD; only UI CSS/font loading changed.
- Existing scoped `npm run typecheck`, `npm run lint`, `npm run functions:typecheck`, `npm run functions:lint`, `npm test` (86 passed) and `npm run test:functions` (5 passed) completed successfully. Existing vendor/icon checks run within the test suite. `git diff --check` and local documentation link checks passed.

Browser verification covers Chrome only, with synthetic records and mocked generation/ingestion responses. No hosted deployment, Safari/Firefox, assistive-technology or comprehensive WCAG compliance claim. Font CDN availability remains an existing external dependency. Typography migration is deferred: legacy 300/600 declarations and browser font matching/synthesis remain outside the approved role tokens. No new dependencies, build/token pipeline, backend/schema changes or business-logic changes.

## Deferred work

Shared components and variants, WIP library implementation, app typography/geometry migration, navigation redesign, Builder layout and keyboard/label accessibility changes, legacy primitive removal, unused spacing/radius scales, and motion specifications. PDF/DOCX typography, colors, margins and generation logic remain outside this phase.

