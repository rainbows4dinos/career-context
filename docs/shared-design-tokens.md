# Shared design tokens: Milestone 1

Historical extraction snapshot. The October 11 [Phase 1 shared foundations](nextchapter-shared-foundations-phase1.md) supersede the palette, font families, semantic values and native-control behavior described below; the ownership and export boundaries still apply.

## Current namespace — October 12, 2026

Shared CSS token names now use `--nc-` (nextchapter). Definitions, application/component consumers, browser-test color probes and documentation references were renamed together. Token values, aliases, theme selectors and export logic are unchanged. Four-page comparisons in both themes confirmed identical resolved styles; all current namespace references are defined. Historical tables below use the current prefix for consistency.

## Standard UI transitions — October 13, 2026

| Token | Value | Use |
| --- | --- | --- |
| `--nc-transition-general-sm` | `150ms ease-in-out` | Hover/press states, compact dropdowns, switches, toasts and similar small state changes. |
| `--nc-transition-general-md` | `300ms ease-in-out` | Mobile navigation disclosure and future modal/lightbox surfaces. |

Use these duration/easing pairs with explicit properties, for example `transition: background-color var(--nc-transition-general-sm)`. Controls, native fields, navigation items, dismiss buttons, theme-switch parts and Builder links consume the small token. The compact account/About dropdown fades and moves 4px with the small token; mobile navigation fades and moves 8px with the medium token. Closed navigation surfaces become inert immediately during their exit transition. Modals and lightboxes remain future work.

Both tokens resolve to `0ms ease-in-out` under `prefers-reduced-motion: reduce`; existing spinner/switch reduced-motion rules remain. Disclosure entry/exit uses CSS `@starting-style` and discrete `display` transitions, with immediate show/hide fallback in browsers without support. See [MDN’s discrete transition guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition-behavior).

Shared stylesheet and navigation-module URLs carry the matching `20261013-transitions` revision across all four entry pages. Tracker’s bootstrap/app imports use the same revision so the header module runs once. This prevents older cached assets from hiding the new transition rules. Live Tracker checks confirmed the tokens and 150/300ms consumers after reload, including a closing mobile menu at intermediate opacity with its links already inert.

Local Chrome checks confirmed 150/300ms computed durations and easing, mobile and compact dropdown opening/closing, immediate inert state, Escape focus restoration and desktop breakpoint recovery. Scoped typecheck/lint and `git diff --check` pass. Reduced-motion token overrides were checked in source; OS preference emulation was not performed.

## Current token cleanup — October 12, 2026

Removed 29 obsolete shared declarations: 17 unused legacy color/alpha primitives, nine compatibility semantic aliases, and three unused/indirect radius aliases. Builder and Tracker now reference current semantic roles directly (`background/page`, `surface/sunken`, `text/muted`, link/selection roles and severity foregrounds). Their local application aliases remain on the theme element. The existing `radius/panel` resolves directly to 10px; current spacing, typography, semantic colors and theme behavior are unchanged.

Browser comparisons on Builder, Tracker, Career Radar and About in both themes found identical resolved application aliases and rendered component colors, font values and radii before/after cleanup. All runtime `--nc-*` references are defined; `git diff --check` passed. No generation, preview/export rules, authentication, persistence or handoff logic changed. The sections below remain the historical October 7 extraction record.

Implemented October 7, 2026 against baseline `1e1533a`, following the approved [foundation audit](shared-design-foundation-audit.md). Only token extraction is implemented; component consolidation and theme redesign remain deferred.

## Ownership and loading

[tools/shared/tokens.css](../tools/shared/tokens.css) contains the existing neutral, coral, cyan/teal and gold colors and alpha variants; semantic surface, border, text, accent, success, warning and error roles; Crimson Pro/Readex Pro font families; a 4/8/12/16px spacing scale; and 4/8/10px radii. Error aliases the existing accent. The new spacing/control-radius foundations do not change component dimensions.

The shared sheet supplies dark defaults and `body.light` overrides. Semantic references are declared on both `:root` and `body` so values resolve on the theme element. It contains no resets, component styles, font downloads or behavior.

The [Builder](../tools/resume-tailor.html) loads `shared/tokens.css` before its embedded styles; [Radar](../tools/prospect-tracker/index.html) loads `../shared/tokens.css` before [its local styles](../tools/prospect-tracker/styles.css). Both paths work under the GitHub Pages repository subdirectory. No workflow, package or dependency changes are needed.

## Compatibility

Legacy variable names remain local aliases, declared on `:root` and `body`. Existing consumers need no class or selector changes.

| Alias | Shared role | Dark | Light |
| --- | --- | --- | --- |
| Builder `--muted` | Tertiary text | `#94918D` | `#7a7870` |
| Builder `--muted-light` | Secondary text | `#BAB8B5` | `#4F4D4A` |
| Radar `--muted` | Secondary text | `#BAB8B5` | `#4F4D4A` |
| Both `--radius` | Panel radius | `10px` | `10px` |

Other aliases preserve their former values. Radar retains its local `color-scheme` declarations; Builder retains its existing native-control behavior. Font-loading URLs, body/label density, hover/focus states and theme JavaScript remain unchanged.

## Validation

Local Chrome comparisons use disposable synthetic Radar data and synthetic résumé/cover-letter content, with no AI calls or hosted database writes. Baseline and updated pages were checked in dark/light modes at **1280×900** and **390×844** for Builder form/résumé preview and Radar board/expanded editor; cover-letter previews were also compared in both desktop themes.

All 18 view comparisons match legacy token values (normalizing equivalent decimal formatting), computed typography, component styling and document-relative geometry after matching interaction states and allowing existing transitions to settle. Source checks confirm Builder JavaScript, preview/export definitions and component CSS are byte-identical, as is Radar's component CSS. Shared extraction introduces no intended visual differences.

Fifteen screenshot pairs are pixel-identical. Three mobile captures differ by 33–346 pixels in small regions, with identical computed styles and geometry; no substantive visual difference was observed. Expanded editor fields were explicitly verified visible in both themes and widths. Screenshots and comparison measurements are temporary local validation artifacts, not committed fixtures.

The scoped Radar typecheck, lint, SDK vendor verification, Edge Function typecheck/lint, **79 Node tests** and **5 Deno tests** pass. Relative assets and documentation links are checked separately; `git diff --check` passes.

## Remaining risks

- The résumé page now depends on a sibling CSS file. A single downloaded HTML file is no longer sufficient; copy the shared stylesheet too. Local HTTP serving and Pages need no build step.
- Publishing must include the shared asset and both entry points. Existing browser caches may need a reload after publishing. Hosted deployment is outside this milestone.
- Existing accessibility, contrast, narrow-header and theme-control debt is unchanged. This validation is a Chrome fixture comparison, not real-device or screen-reader acceptance.
- Exports were not regenerated: export code and preview styling are unchanged, and both document previews were compared directly.

Stop here for review before any shared primitive, JavaScript, typography or palette changes.
