# Shared design foundation audit

Date: October 7, 2026. Baseline: `1e1533a`.

Audit and proposal only. No application, style, configuration, dependency or database changes are authorized by this document. Follow [AGENTS.md](../AGENTS.md); review before implementation.

## 1. Current architecture

Source references used below:

- **B:** [Résumé Builder](../tools/resume-tailor.html): embedded CSS, static markup and global script functions in one file.
- **R:** [Radar stylesheet](../tools/career-radar/styles.css): one external, application-wide stylesheet.
- **UI:** [Radar UI factories](../tools/career-radar/ui.js); [ingestion UI](../tools/career-radar/ingestion-ui.js).
- **Entries:** [Radar HTML](../tools/career-radar/index.html), [bootstrap](../tools/career-radar/bootstrap.js), [application controller](../tools/career-radar/app.js).

Neither app has a CSS framework, preprocessor or frontend build. Builder uses simple classes, descendant selectors, inline styles and inline event handlers. Radar uses native ES modules, DOM factories and classes; its npm tooling is scoped to Radar. There is **no shared stylesheet or UI module today**: Radar explicitly copies Builder's tokens (R:1–3). Cross-links do not create a style dependency.

Both load Crimson Pro and Readex Pro from Google Fonts. Only Builder loads Crimson Pro italic and Material Icons (B:7–10; Radar entry:7–10). Both default dark, use `body.light`, and persist the same origin-wide `localStorage.theme` preference (B:297–302,343–346; bootstrap:1–11). Neither follows system preference or synchronizes already-open tabs. Radar catches storage failures; Builder does not. Radar declares `color-scheme`; Builder does not.

The existing palette/font vocabulary is a usable foundation. **Share its source, not either app's entire stylesheet.** Builder's document previews and independent PDF/DOCX export formatting must remain outside general UI styling (B:98–117,1040,1116,1280,1323–1420).

## 2. Existing token inventory

Builder defines 19 custom properties; Radar defines 12. Builder tokens: B:13–33,149–166. Radar tokens: R:2–3.

| Role / current properties | Dark | Light | Difference |
| --- | --- | --- | --- |
| Page `--bg` / text `--text` | `#232221` / `#FFFBF6` | reversed | Identical |
| Surfaces `--surface`, `--surface2` | `#2d2b29`, `#363330` | `#F5F2EC`, `#EDE9E2` | Identical |
| Borders `--border`, `--border-subtle` | `#4F4D4A`, `#3a3835` | `#BAB8B5`, `#DEDBD8` | Identical |
| Builder `--muted` | `#94918D` | `#7a7870` | Dimmer text role |
| Builder `--muted-light`; Radar `--muted` | `#BAB8B5` | `#4F4D4A` | Same values, different names/meaning |
| Accent `--accent`, `--accent-bg` | `#F26F6F`, coral at .12 alpha | `#CA5C5C`, coral at .10 alpha | Identical; only Builder has `--accent-border` (.35/.30) |
| Success `--success` | `#6FEAF2` | `#377579` | Identical; only Builder declares `--success-bg` (.10), unused in its CSS |
| Builder warning/revision `--yellow`, backgrounds/borders | `#F2C56F`, .12/.30 | `#796237`, .08/.25 | Radar has none; Builder highlight separately hardcodes yellow at .18 |
| Fonts / `--radius` | Crimson Pro + Georgia; Readex Pro + sans-serif; 10px | same | Identical |

Untokenized values are common in both:

- Typography: body 16px Builder / 15px Radar; weights 300–600. Builder labels are 12px uppercase with tracking, Radar labels 13px sentence case. Headings, small text and line heights are local (B:34–61,98–124; R:6,10–11,32,44,47–49).
- Spacing/sizing: repeated 4/6/8/10/12/16/20px and rem values; controls use 10px 13px versus 10px 12px; panels use 1.75rem versus 1.5rem. Builder shell and Radar editor are 860px; Radar shell 1400px/login 520px (B:35,48,57; R:7,23–24,48,53).
- Radii: 10px panel token, hardcoded 8px controls/cards, 4px Radar badge, 3px revision highlight and pill/circle values. Borders are generally 1px, focus/active/spinner strokes 2px. Neither stylesheet uses shadows.
- State values: Builder hover opacity .88 and disabled .35; Radar disabled .5 and hover border accent. Builder transitions .15/.20 seconds; spinners .75 seconds. Builder's build/QA warning color `#c98a2b` is hardcoded in script/templates (B:332,973).

These are UI values. Export colors, fonts and point/inch measurements are a separate document system, not missing UI tokens.

## 3. UI primitive inventory

| Primitive | Existing implementation / differences | Sharing decision |
| --- | --- | --- |
| Buttons | B:119–136: primary, secondary and separately styled revision action. R:16–22; UI:12–17: native buttons, primary/secondary, default secondary helper. Padding, border, hover and disabled states differ. | First shared CSS candidate; preserve initial dimensions and business handlers. |
| Inputs/textareas | B:50–63,130–133,230–256: detached labels, duplicated revision styling. R:47–51; UI:79–86,102–125: wrapping labels, native required/email/url/date fields. | Share control surface/font/border/focus rules; keep validation/form ownership local. |
| Selects | Radar native selects for arrangement/status (UI:89–94,122,134). None in Builder. | Include native select styling with controls; no JS abstraction needed. |
| Checkboxes/radios | No native checkbox/radio controls in either app. Builder focus chips are clickable multi-select spans (B:65–69,424–436). | Keep emphasis selection local; use accessible pressed-button semantics in a later approved fix. Do not build unused checkbox/radio components. |
| Dialogs/modals | Builder native `alert()` (B:491,1207,1262); Radar native `confirm()`/before-unload guards (controller:51–52,92,164–179). No custom modal. | Retain native behavior. A modal library is premature. |
| Dropdowns | Radar native selects and Source datalist (UI:112–120); no custom menu in either app. | Native styling only; no popover/menu system. |
| Tabs | Builder clickable divs and display toggling (B:89–96,273–282,448–453). Radar has hash navigation, not tabs. | Builder-specific until a second real consumer; accessibility repair is needed. |
| Badges/status | Radar count/card-status (R:39,44; UI:35–57); Builder steps, focus chips and revision highlights (B:65–75,141–144). | Share compact text/surface tokens, not workflow components or canonical status logic. |
| Tooltips | Builder theme `title` attribute (B:212). No custom tooltip primitive. | Keep native hint; provide an actual accessible name for the control. |
| Feedback/loading | Builder spinner, loading copy, callouts and revision feedback (B:77–86,137–144,263–268). Radar notice, login alert, inline feedback, empty/retry views (R:25–28; UI:21–25,31,126–138; ingestion:19–21,58–78). No toast system. | Shared visual feedback roles later; app owns messages, timing, retry, cancellation and live-region behavior. |
| Navigation/disclosure | Cross-app navigation in both headers; Radar board/editor links and native details/summary (UI:37–42,97–100,107); Builder step bar. | Share link/focus treatment and disclosure styling if useful. Keep layouts/routes/workflows local. |

Shared styling does not require shared rendering. Radar's `el()` is a safe `textContent` factory, not a reason to migrate Builder's templates or domain logic.

## 4. Inconsistencies and debt, ordered by impact

1. **Keyboard and accessible naming:** Builder theme toggle, chips and tabs are non-focusable divs/spans with mouse handlers; field labels lack `for` associations, and revision textarea has only a placeholder. Loading updates lack Radar's live-region pattern. Radar already uses native controls, focus-visible outlines, labeled forms and route focus. Repair Builder semantics in a separate approved accessibility pass; retain its behavior.
2. **Contrast/focus concerns:** computed solid-color ratios are about 3.92:1 for light accent on page background and 3.96:1 for Builder light muted text on its card surface. This also affects small light-mode primary-button text. Builder removes text-control outlines and uses only a border change; its link outline uses translucent accent. Verify focus, disabled and text states before choosing new semantic values. These source calculations are not a full rendered accessibility audit; no palette change is proposed now.
3. **Token duplication and naming drift:** the `--muted` mismatch means blindly centralizing current names changes one app's appearance. Repeated 8px radii, padding and warning colors make future theme changes unnecessarily broad.
4. **Local repetition/coupling:** Builder revision input/button/spinner repeat base declarations; `.tab-actions button.primary`, `.revise-bar button` and inline cover-letter styles couple appearance to structure (B:92–93,130–139,992–1003). Radar selectors such as `.column-done .prospect-card strong` and `.ingestion button` are legitimate local overrides, but cannot become universal primitive rules (R:38,57). Specificity is mostly low; the `[hidden] !important` utility is intentional, not evidence of a specificity problem.
5. **Responsive differences:** both collapse forms at 600px. Radar additionally scrolls the board below 1000px and uses 82vw columns on mobile; Builder wraps tabs/actions but has an absolute theme toggle beside a long heading (B:146,169–174; R:62–63). Check header overlap and long content on narrow screens. Board scrolling is a product requirement, not something a shared layout reset should eliminate. Builder spinner lacks a reduced-motion rule.

## 5. Recommended token structure

Use ordinary CSS custom properties with a `--ds-` prefix, three responsibilities and one common dark/light theme. No token compiler, JSON registry or product theme fork.

| Layer | Contents | Ownership |
| --- | --- | --- |
| **A. Global foundations** | Existing neutral/coral/cyan/gold literals and alpha variants; font families/available weights; small observed spacing/type scales; 1/2px strokes; 4/8/10px and pill radii; .15/.20s motion. Elevation starts as none. | Shared `tokens.css`; preserve current palette and values. |
| **B. Shared semantics** | Page/raised/inset surfaces; primary/secondary/tertiary text; control/subtle borders; accent/action foreground/background; success/warning/error roles; focus ring; disabled/hover state values; control radius, panel radius and helper text size. | Same shared file; semantic colors switch under `body.light`. Initially error may alias accent and warning may alias existing gold. Separate roles now without adding colors. |
| **C. Product tokens** | Builder document-preview typography/spacing and wizard layout; Radar board column geometry, card density, editor/login widths. | Local CSS consuming shared foundations/semantics; these are layout/component choices, not separate color themes. |

For a visually neutral first extraction, Builder's legacy `--muted` aliases shared tertiary text and `--muted-light` aliases secondary text; Radar's `--muted` aliases secondary text. Other existing variables alias their equivalent shared semantic roles. Retain current control dimensions/state differences locally until deliberately unified. Do not use one global body size, label casing or reset to erase them accidentally.

Declare compatibility aliases on the theme element (`body`), where light-mode overrides apply. Root-resolved aliases can otherwise retain dark values when only descendant semantic tokens change. Check both modes' computed values during extraction.

Use role tokens in components, so future palette/type exploration changes a small theme block. Tokenize repeated meaningful values; leave one-off document layout constants local. Do not add shadows or token families for components that do not exist.

## 6. Component boundaries

Start with shared **CSS primitives**: opt-in button variants, text controls, panel surface, links/focus and inline feedback. Classes should use a `ds-` prefix, with local size/layout overrides outside the shared sheet. Native HTML remains authoritative for labels, required fields, keyboard behavior and disabled controls.

Consider one small theme helper only after tokens stabilize: retain `body.light` and the existing `theme` key, catch storage failures and use a native named button. No component framework, custom-element registry or wholesale shared DOM factory is needed. Builder's classic-script/global-handler arrangement makes a JS extraction riskier than CSS; choose its loading bridge separately when that step is approved.

Keep Builder generation, steps/tabs, emphasis choices, revision highlighting and document previews local. Keep Radar Kanban, prospect forms, status/history, ingestion provenance/duplicates and stale-edit protection local. A shared feedback component must never own persistence, Auth or dirty-draft decisions.

## 7. Repository organization

Proposed resources, not files created by this audit:

- `tools/shared/tokens.css`: foundations, semantic roles and common theme overrides.
- `tools/shared/primitives.css`: opt-in reusable controls/surfaces after incremental extraction.
- `tools/shared/theme.js`: optional later behavior helper; defer until needed.

Builder loads `shared/tokens.css`; Radar loads `../shared/tokens.css`, before their local styles. Use relative asset URLs to work locally and under `/career-context/` on Pages. Keep entry points and canonical context paths unchanged. The [Pages workflow](../.github/workflows/pages.yml) uploads the root as static files (lines 48–54); this needs no bundling or deployment restructuring.

Do not import either app's full stylesheet into the other. Shared CSS should avoid global `body`, `header`, `label`, `.primary`, `.card`, `.shell` or universal margin resets; preserve each local reset initially. Fonts may keep their current HTML links during extraction; later align supported font weights/styles without adding a new external dependency. If shared JS is eventually imported, explicitly include it in Radar's scoped typecheck/lint coverage. Do not move Radar's package/dependencies to the root.

## 8. Incremental migration

1. **Approve this audit and boundaries.** Capture baseline screenshots for both themes, narrow/desktop layouts, controls and Builder preview/exports using safe sample data. Establish keyboard checks.
2. **Extract tokens only.** One shared file, local compatibility aliases, unchanged values and geometry. Verify computed values/screenshots and font loading; keep JS and export definitions untouched. This is the lowest-risk initial implementation.
3. **Remove obvious local duplication.** Reuse Builder's existing control/button rules for revision controls; replace repeated radii and warning/highlight literals with appropriate tokens. Preserve outputs and state behavior. Avoid broad class renaming.
4. **Consolidate one primitive at a time.** Start buttons and inputs/panels, retaining local dimensions. Address keyboard/labels/focus as an explicit accessibility step, with behavior checks. Shared JS is optional, not a prerequisite.
5. **Review common interactive semantics.** Decide body/label density, hover/disabled/focus and theme control presentation deliberately; do not conceal visual changes inside extraction.
6. **Explore themes after the foundation holds.** Adjust shared semantic mappings and validate contrast. Keep Career Radar board/editor UX redesign a separate phase.

Use small diffs and existing Radar checks, plus focused manual Builder/keyboard/responsive verification. Run export inspection only where previews/document paths could be affected. No AI calls are needed for token work; safe existing sample outputs can exercise preview states. Do not generate real applications repeatedly to validate styling.

## 9. Risks and open decisions

- **Review boundary:** extracting Builder's palette into a relative asset is a narrow proposed exception to its standalone packaging, not authorization to split its application. Pages/local HTTP remain simple; a downloaded single HTML file would now need sibling CSS. Decide whether single-file portability remains a requirement before extraction.
- **Visual decisions:** keep both current text strengths as secondary/tertiary; later choose where each belongs. Decide whether labels/body sizes should converge and whether Builder's switch or Radar's button becomes the shared theme affordance. Do not invent product-specific themes to preserve temporary differences.
- **Export/preview boundary:** broad resets, inherited font changes and generic button flex rules can unexpectedly affect Builder's preview. Keep document styling and PDF/DOCX constants independent; no theme-dependent exports.
- **Loading/caching:** shared CSS introduces a common asset dependency. Verify both Pages-relative URLs and cache refresh after publishing; avoid simultaneous UI redesign during this step.
- **Audit limits:** this is source inspection with computed color comparisons, not a new real-device or screen-reader acceptance run. No live Supabase records or private import files were needed. Automated Radar checks do not cover Builder's visual behavior.

Recommended first approved milestone: **shared tokens with compatibility aliases and unchanged appearance**. Leave broad component consolidation, theme redesign and Radar UX work for subsequent reviews.
