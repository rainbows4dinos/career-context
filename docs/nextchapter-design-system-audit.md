# nextchapter design-system audit

October 10, 2026 · Source baseline: `40a2132`.

Read-only audit of the current implementation. Only this report was added. No application code, CSS, tokens, configuration, dependencies, behavior or database structures were changed. Recommendations below are proposals for separately authorized work.

Method: source inspection of the three entry pages, shared styles/modules, Tracker presentation/controller code, Builder state/rendering/export definitions and existing design documentation. Contrast values were calculated from declared opaque sRGB colors using relative luminance. No new browser, assistive-technology, deployment or live-data testing was performed for this audit. Prior navigation validation is recorded in [nextchapter-navigation.md](nextchapter-navigation.md), not claimed as new audit testing. Latest Figma specifications were not inspected or inferred.

## A. Executive summary

The suite has an early shared foundation, rather than a complete design system. All three applications consume one palette and font-family source, one semantic light/dark mapping and one navigation/theme implementation. The primitive/semantic separation is already structurally suitable for the next phase; replacing it with a token pipeline or framework would add little value.

Most component styling remains local. Builder has embedded CSS, static markup, inline event handlers and inline styles in rendering functions. Tracker uses an external stylesheet and local DOM factories. Their common colors and fonts disguise differences in control density, labels, focus, feedback and accessibility. The shared header is a useful first component but still depends on app aliases and resets.

The existing visual palette is gold with warm neutrals and cyan/teal success colors. It does **not** implement the proposed lavender identity or violet-toned dark neutrals. Builder is the primary code reference for editorial typography and interaction patterns; its current values are not approved future design specifications.

Highest priorities are accessible control semantics and usable light-theme contrast, followed by a Figma-approved foundation mapping and shared button/form styles. Keep document previews/exports, generation logic, status history, prospect cards and Kanban behavior local. The placeholder needs very little independent work.

An important layout discrepancy: Builder currently uses the **same 860px maximum shell in every state**, including previews. There is no implemented wider preview shell or state-specific width switch. Treat the requested narrow-input/wide-preview distinction as a future Figma/layout requirement, not existing behavior.

## B. Existing foundations inventory

### Ownership and naming

| Source | Current responsibility |
| --- | --- |
| [tokens.css](../tools/shared/tokens.css), lines 1–83 | Primitive palette, alpha colors, font families, minimal spacing/radii; dark semantics and `body.light` mappings |
| [Builder](../tools/resume-tailor.html), lines 17–151 | Legacy aliases, reset, app typography, forms, components and screen document styles |
| [Tracker styles](../tools/career-radar/styles.css), lines 1–78 | Legacy aliases, native color scheme, reset, app typography, controls, board/editor layouts |
| [navigation.css](../tools/shared/navigation.css), lines 1–46 | Shared header, active/focus state and extracted theme switch |
| [icons.css](../tools/shared/icons.css) and [icons.mjs](../tools/shared/icons.mjs) | SVG icon presentation and accessible DOM helper |

The `--nc-*` prefix provides a coherent shared namespace. Each functional app retains shorter aliases on both `:root` and `body`; the latter is important because `body.light` owns semantic overrides. Builder's `--muted` means **tertiary** text, while Tracker's means **secondary** text. Builder's `--muted-light` corresponds to Tracker's `--muted`. A shared component cannot safely assume these names have identical meaning.

### Color primitives

All of these definitions live on `:root`, independent of active theme:

| Primitive group | Existing values |
| --- | --- |
| Neutral 50 / 100 / 200 / 300 | `#FFFBF6`, `#F5F2EC`, `#EDE9E2`, `#DEDBD8` |
| Neutral 400 / 500 / 600 / 700 | `#BAB8B5`, `#94918D`, `#7a7870`, `#4F4D4A` |
| Neutral 800 / 850 / 900 / 950 | `#3a3835`, `#363330`, `#2d2b29`, `#232221` |
| Coral 400 / 600 | `#F26F6F`, `#CA5C5C` |
| Cyan 300 / teal 700 | `#6FEAF2`, `#377579` |
| Gold 300 / 700 | `#f6d391`, `#f3bc58` |
| Alpha primitives | Four coral background/border variants, cyan and teal backgrounds, four gold background/border variants |

The warm cream is present; the dark neutrals remain warm brown/gray, not the intended cooler violet scale. There is no lavender primitive. Coral definitions remain available but are not current app accent mappings. Do not delete them solely because they are presently unused.

Alpha definitions include `dark`/`light` in their names, but their values are fixed primitives selected by semantics; they are not themselves overridden by theme. They duplicate literal RGB channels rather than deriving from solid primitives. Gold dark background/border channels also differ from the current solid gold values. This is real palette maintenance debt, but changing it now would change appearance without an approved reference. Gold `300`/`700` is not a well-defined full tonal scale; preserve identifiers until Figma establishes one.

### Semantic mappings

| Semantic role | Dark mapping | Light mapping |
| --- | --- | --- |
| Page / raised / inset | Neutral 950 / 900 / 850 | Neutral 50 / 100 / 200 |
| Control / subtle border | Neutral 700 / 800 | Neutral 400 / 300 |
| Primary / secondary / tertiary text | Neutral 50 / 400 / 500 | Neutral 950 / 700 / 600 |
| Accent | Gold 300 | Gold 700 |
| Accent background/border | Gold dark alpha pair | Gold light alpha pair |
| Success/background | Cyan 300 / cyan alpha | Teal 700 / teal alpha |
| Warning/background/border | Gold 300 / gold dark alpha pair | Gold 700 / gold light alpha pair |
| Error | Reference to accent | Same reference resolves to light accent |
| Panel radius | Radius large, 10px | Same |

Color ownership is centralized, but role usage is incomplete: `--nc-error` is defined yet Tracker `.error` uses its accent alias; warning, error and interactive accents share gold. There are no dedicated disabled, focus-ring, selected, on-accent or hover semantic roles. Distinct roles may be useful even if Figma initially maps some to the same value. Do not introduce a large matrix of hypothetical statuses.

### Hardcoded colors and duplication

General UI CSS uses variables for most foregrounds and surfaces. Exceptions and boundaries:

- Builder revision highlight uses `rgba(242, 197, 111, 0.18)` directly (line 147).
- Builder cached-version text and preview QA border use `#c98a2b` (lines 306 and 942), outside the shared warning mapping.
- Builder preview templates contain many inline type/spacing declarations using token aliases (lines 937–972). These are duplicated rules, but mostly not duplicated palette literals.
- PDF/DOCX colors deliberately remain independent: black, `1a1a1a`, `555555`, `888888`, link blue `1155cc`, rule gray `aaaaaa` (lines 989 and 1295 onward). Do not replace export colors with themed app colors. Their repeated values across two export engines are not justification to couple them to the web UI.

### Typography

| Context | Existing typography |
| --- | --- |
| Shared families | Crimson Pro with Georgia/serif fallback; Readex Pro with sans-serif fallback |
| Loading | Google Fonts links on each entry page, with preconnect and `display=swap`; font files are not locally bundled |
| Builder font variants | Crimson regular/italic 400/600; Readex 300/400/500/600 |
| Tracker and placeholder | Crimson regular 400/600; same Readex weights; no requested italic face |
| Body | Builder 16px/1.6, weight 300; Tracker/placeholder 15px/1.6, weight 300 |
| Headings | Builder app heading 32px/600, serif, −.01em tracking; inherits 1.6 line height. Tracker h1/h2/h3 32/26/22px, serif 600, line height 1.2 |
| Shared wordmark/nav | 28px serif 600 wordmark; nav inherits app body size/weight/line height |
| Form labels | Builder 12px/500, uppercase, .08em tracking; Tracker 13px/400, sentence case |
| Supporting text | Builder largely 13–15px, weights 300–400; Tracker captions/time 13px, badges 12px/400 |
| Document screen styles | Résumé name 26px; section label 11px/500 uppercase/.1em; summary/bullets 15/14px with 1.8 line height; cover body 15px/1.9 |
| Export typography | DOCX Helvetica Neue, PDF Helvetica with Roboto fallback; document dimensions and font units remain export-specific |

Builder's CSS font-size set is 11, 12, 13, 14, 15, 16, 22, 26 and 32px; shared wordmark adds 28px. There is no shared type scale, weight, line-height or tracking token set. These values are an inventory, not a recommended final scale. Share the high-frequency UI roles after approval; preserve document roles separately.

### Spacing, layout and remaining foundations

| Foundation | Current implementation | Sharing opportunity |
| --- | --- | --- |
| Spacing | Shared 4/8/12/16px tokens exist but are not consumed by app component rules; literals include 3/4/5/6/8/10/11/12/13/14/15/16/18/20px and .5/.75/1/1.25/1.35/1.5/1.75/2/2.5/3.5rem | Adopt a small approved rhythm for controls/panels/actions. Leave content-specific indentation and document spacing local. |
| Shells | Builder 860px throughout; Tracker/placeholder 1400px; Tracker editor 860px; login/placeholder panel 520px | Shared container vocabulary can allow local widths rather than impose one shell. |
| Form grids | Both two equal columns; Builder gap 12px, Tracker horizontal gap 16px; one column at 600px | Share field layout only if dimensions/states are aligned; keep form structure and data behavior local. |
| Board | Five flexible columns; at 1000px, five 200px columns; at 600px, five 82vw columns; horizontal overflow | App-specific responsive strategy, not a shared grid component. |
| Padding | Body 2rem 1rem in both; Tracker reduces to 1rem at 600px. Builder card 1.75rem, Tracker panel 1.5rem/1rem mobile | Standardize component padding where supported by Figma; preserve document preview spacing. |
| Radius | Tokens 4/8/10px; panel token 10px is consumed. Controls mostly literal 8px; badges 4px; pill/switch 999px; highlight 3px; focus rounding 2/3px | Use existing radius names once intended values are approved; pill can stay a simple local convention. |
| Borders/shadows | Mostly 1px borders; active/focus/spinner 2px; QA border 3px. No app box-shadow rules found | Define focus treatment and border roles; do not invent elevation tokens without designs. |
| Motion | .15s color/opacity/all transitions; .2s switch/step transitions; .75s infinite spinners. No reduced-motion override | Small duration/easing conventions and a non-rotating reduced-motion loading treatment could solve actual inconsistency. |
| Z-index | Only switch thumb `z-index:1`; no overlay stack | No need for a global z-index scale yet. |
| Icons | Gravity helper defaults 16px, accepts explicit size, uses currentColor and accessible/decorative modes; Material switch icons 14px; inline Unicode arrows remain | Gravity is available but no production call sites use `gravityIcon()` yet. Agree on usage before converting icons; do not add another package. |

## C. Component inventory

| Pattern and location | Reuse today / behavior | Recommendation |
| --- | --- | --- |
| Suite header, shared navigation module/CSS | Already shared across all three; module-relative URLs, per-page active identity, origin-wide theme | Retain; reduce dependencies on local CSS before expanding its role. |
| Theme switch, same shared files | One native button; accessible action label/pressed state; app appearance controlled by `body.light` | Keep one implementation; reconcile native-control color scheme and early initialization separately. |
| Primary/secondary buttons, Builder lines 125–130 and Tracker CSS lines 31–36 | Similar classes, different selectors/padding/hover/disabled conventions; Tracker `button()` factory is local | Share visual classes for native buttons; handlers, pending and confirmation logic stay local. No shared JS factory required for this alone. |
| Text fields/textareas, Builder lines 52–67 and Tracker CSS lines 63–70/UI lines 80–98 | Similar native controls; Builder static `.field`, Tracker wrapping labels and typed field factories | Shared control styling plus label/hint/error contract is high-value. Preserve names/IDs and existing data binding. |
| Selects, Tracker `selectField()` | Status/work arrangement only; native browser menu | Style alongside shared controls; no shared dropdown widget or custom menu needed. |
| Panels/cards, Builder `.card`, Tracker `.panel` | Both raised surface/border/radius; padding and contents differ | Shared surface utility may be useful; preview, loading and prospect card layouts remain local. |
| Feedback/callouts | Builder `.tailor-note`, `.revised-note`, handoff status and errors; Tracker notice/feedback/login alert | Share visual intent roles and accessible message contract; keep message timing/recovery and wording local. |
| Preview tabs, Builder lines 216–217 | Clickable divs; `showTab()` controls panels and `activeTab` used by revision | First make local tabs accessible. No second tab implementation exists to justify a generic shared tab module now. |
| Focus pills, Builder `renderChips()` | Clickable spans and array state; parsed from canonical emphasis list | Local multi-select control; convert semantics/accessibility without inventing a shared filter system. |
| Step bar/loading/revision spinner | Builder-specific generation/revision state | Shared motion/color foundations only; preserve state machine. |
| Prospect card/status badge/column | Tracker `boardView()` and stylesheet | Keep card/column behavior local; badge styles could eventually reuse generic status presentation if another app needs them. |
| Empty/loading/error panels | Tracker `messageView()`; board empty copy; Builder loading text and retry button | Share visual feedback conventions; avoid a universal state component with unrelated workflow props. |
| History/ingestion review/duplicates | Tracker UI and ingestion modules | App-specific; adopt foundations/control styles without moving logic. |
| Dialogs | Native `confirm()`/`alert()` in both; no custom modal or dialog renderer | No existing custom dialog to consolidate. Do not build one during foundation extraction. |
| Tooltips/dropdown menus | Theme button `title`; native select; no custom tooltip/menu system | No current need for shared widgets. |

Tracker's factories are reusable **inside Tracker**, not a cross-suite component system. Builder's repeated revision button styling is a useful consolidation target, but superficial similarity to a status action is not grounds to share their behavior.

## D. Application comparison and state review

| Area | Résumé Builder | Prospect Tracker | Shared header / Career Radar |
| --- | --- | --- | --- |
| Architecture | Static HTML, embedded CSS/global functions/inline handlers | ES modules, DOM factories, scoped tooling and external CSS | Header: one DOM-rendering module; placeholder: static main panel |
| Shared today | Palette/semantics, families, nav/theme; icon CSS available | Same | Header uses direct shared roles plus legacy aliases in switch; placeholder imports all Tracker CSS |
| Layout | 860px shell for all states, two-column input grid | 1400px shell, 860px editor, 520px login | Header inherits host width; placeholder 520px panel in 1400px shell |
| Hierarchy/density | Uppercase small labels; more generous card padding; muted tertiary captions | Sentence-case labels; denser controls; secondary captions | Header nav type density differs by app inheritance |
| Interaction | Opacity hovers/disabled states; click-only custom tabs/chips | Border hovers; native inputs/select/details and link cards; disabled fieldsets | Native header controls and active underlined link |
| Feedback | Loading stages, QA/revision callouts, alerts and handoff notice | Live status/alerts, draft-preserving retry/ingestion feedback | Placeholder needs neither loading nor workflow feedback |

**Builder Job Details:** consistent field rows and cards, but labels are not associated with input IDs. Focus chips have no native button semantics. Additional-notes height is inline 72px rather than the standard 140px textarea. The form is not a native `<form>`; required content is checked in `goTailor()` with an alert.

**Generating:** same shell, with centered 3.5rem/2rem loading card and rotating spinner. `setStep()` toggles display and step classes; it does not update width, announce current step or move focus. Loading status/substatus lack live-region semantics. Retry button positioning is generated inline (line 666).

**Résumé Preview:** tab actions share a row; document content uses `.card` and screen typography with inline template fragments. Long job headings and dates share a flex row without a specific narrow-screen override. This is a responsive review candidate, not a demonstrated overflow in this audit.

**Cover Letter Preview:** same width and tab shell; more generous paragraph line height and inline metadata/separator styles. Both preview types are themed web presentations, not exact PDF/DOCX page renders. Keep export styling independent; dark UI changes must not darken exported documents.

**Tracker:** grouped lifecycle board, ordinary prospect links and native Done disclosure. Applied sorts by known application date then discovery/creation recency, initially showing ten cards with an accessible show-all control ([view-model.js](../tools/career-radar/view-model.js), lines 6–64). Other columns preserve data-layer creation ordering ([data.js](../tools/career-radar/data.js), line 59). There is no user-facing search/filter/sort widget, drag-and-drop Kanban, or custom overlay to audit. Do not add those as design-system work.

Tracker's editor uses two-column fields, Job Description above More job details/Notes, separate save/status forms, and append-only status history. Ingestion has editable provenance hints, warnings and explicit duplicate decisions. Busy states disable fieldsets and logout; workspace receives `aria-busy` ([app.js](../tools/career-radar/app.js), lines 60–67). These conventions should survive any visual rollout.

**Header:** semantic nav, meaningful active link, native button, explicit focus outline, wrapping links and module-relative routes are sound foundations. No hamburger or router is needed. Weaknesses: generic `.theme-toggle`/`.toggle-*` selectors; switch colors use `--surface2`, `--border`, `--accent`, `--text`, `--muted`; hover thus differs with host aliases. Nav typography and some box-model assumptions remain inherited. Header rendering is a module side effect targeting one ID, suitable for one header per static page; multiple instances/lifecycle abstractions are unnecessary now. Tracker's second top-level header may create duplicate banner landmarks; confirm the accessibility tree before changing structure.

**Career Radar:** shared header/theme plus Tracker's typography/panel styles; no independent discovery UI. Its import of the whole Tracker sheet is convenient but creates coupling to future tracker-specific resets/rules. Eventually use minimal shared page/panel foundations, not a separate component system.

## E. Theme architecture assessment

The sole runtime owner is [navigation.mjs](../tools/shared/navigation.mjs), lines 28–47. Default is dark. Initialization reads guarded `localStorage.theme`, applying `body.light` only for `light`; clicking toggles the class and persists `light`/`dark`. Storage events update other open pages, including resetting dark after storage is cleared. All three share preference on the same origin; separate origins/ports do not share it. Storage failures preserve current-page interaction but cannot persist preference.

Shared semantics are centralized on the theme element; application color overrides are aliases rather than independent palettes. Explicit light/dark selectors remain necessary for the switch thumb/icon positions; ordinary components mostly follow semantics without theme selectors.

Identifiable gaps and recommendations:

1. **Initialization timing:** module execution waits for parsing/fetching and initially empty headers also wait for JS. A saved light preference can briefly show dark default; this is a timing risk from source, not a measured flash. If confirmed under throttling, use a tiny early theme initializer or equivalent shared initialization strategy without changing the persisted key or moving all theme semantics casually from body to root.
2. **Native color scheme:** Tracker and placeholder declare dark/light `color-scheme`; Builder does not. Native controls can therefore differ despite equal CSS colors. Centralize an approved color-scheme convention and test native controls in both themes.
3. **Alias coupling:** retain body-scoped aliases during migration. New shared components should consume explicit `--nc-*` roles; removing aliases before consumers migrate would break theming.
4. **Role contrast:** changing hue alone will not fix light contrast. Specify on-accent, focus, error and readable muted roles with tested mappings in each theme.
5. **Scope:** no need to add system-theme mode, theme context/provider or cross-app state framework. The current two-theme contract is deliberate existing behavior; system preference is a separate product decision only if wanted later.
6. **Storage event ownership:** handler checks the key, not storage area. A future sessionStorage key named `theme` could spuriously affect the UI; no current producer exists, so this is low-priority hardening rather than a present user defect.

## F. Prioritized technical debt, accessibility and risks

### Static contrast findings

For normal text the reference threshold is 4.5:1; large text has a 3:1 threshold. Relevant non-text component/state cues generally require 3:1 against adjacent colors, with contextual exceptions. See [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). This is not a WCAG compliance determination.

| Declared color pair | Calculated ratio, rounded for display | Interpretation |
| --- | --- | --- |
| Light accent `#f3bc58` / page `#FFFBF6` | 1.68:1 | Used by links, active header links, errors and focus outlines; inadequate text contrast |
| Light accent / raised `#F5F2EC` | 1.55:1 | Card-title/callout use also needs correction |
| Light primary-button text `--bg` / accent fill | 1.68:1 | Both apps use cream text on gold fill; inadequate text contrast |
| Light tertiary `#7a7870` / page | 4.29:1 | Builder's normal-size supporting text/placeholders below 4.5 |
| Light tertiary / raised | 3.96:1 | Builder supporting text on cards below 4.5 |
| Dark tertiary / page | 5.06:1 | Above normal-text threshold for this pair |
| Dark accent / page | 11.08:1 | Above normal-text threshold for this pair |
| Light success / page | 5.12:1 | Above normal-text threshold for this pair |
| Dark control border / page | 1.89:1 | Candidate control-boundary issue; determine whether boundary is necessary for identifying that control |
| Light control border / page | 1.92:1 | Same contextual assessment required |

Calculations cover opaque pairs only, not every alpha background, hover, opacity-disabled state or focus adjacency. Preserve source precision when checking thresholds; do not use rounded values as pass/fail evidence. Native focus indicators and browser select/password rendering need browser inspection.

### Prioritized findings

| Priority / finding | Evidence and impact | Recommended timing / change risk |
| --- | --- | --- |
| High: light contrast | Token light mappings lines 67–83; Builder buttons/links; Tracker `.primary`, `.error`; header focus/active links | First foundation phase, with approved alternatives. Broad visual impact; keep text-on-fill separate from accent before changing values. |
| High: Builder labels | HTML lines 174–200: labels have neither `for` nor wrapped controls; revision textarea only has a placeholder | First accessible-control slice. Associate existing IDs without renaming them; low styling risk. |
| High: Builder tabs/chips keyboard semantics | Clickable divs lines 216–217 and spans generated at 393–395; no tabindex, keyboard handler or selected ARIA state | Before visual standardization. Local native controls/tab pattern; medium behavior risk because `activeTab` and chip state drive revisions/generation. |
| High: focus consistency | Builder inputs/revision textarea remove outline and rely on border color; Tracker has a global 2px outline; shared header has its own outline; most Builder buttons use UA focus | Foundation/control phase. Confirm focus visibility in both themes without suppressing UA indicators prematurely. |
| Medium: semantic progress/error feedback | Builder loading/revision nodes lack live status roles; step state only classes; alerts require interruption. Tracker uses status/alert regions but no field-specific error associations | Add appropriate announcements and local error association in small behavioral slices. Avoid moving focus on every streamed update. Screen-reader validation required. |
| Medium: shared CSS depends on host | Header alias colors/global toggle names and inherited nav type; Builder universal reset vs Tracker element reset | Before more shared components. Medium regression risk; verify computed header styles in every app and theme. |
| Medium: native-control theme mismatch | Builder omits `color-scheme`, Tracker supplies it | Shared foundation slice. Small effort; browser-specific native-control changes need inspection. |
| Medium: preview/body width distinction absent | Builder `.shell` line 40 and `setStep()` lines 408–415 | Wait for approved Figma widths/responsive rules. Medium layout risk; do not assume wider is automatically better. |
| Medium: inline screen styling | Builder app heading, notes height, retry control, generated preview metadata/QA border | Extract only targeted repeated UI rules as related components migrate. Large broad cleanup risks preview/export confusion. |
| Medium: motion preferences | Spinners and transitions, no `prefers-reduced-motion` | Small motion slice after treatment is defined. Absence alone is not a blanket WCAG failure; preserve textual loading feedback. |
| Low: unused small scales/legacy palette | Shared spacing/radius primitives largely unused, coral retained; alpha channels duplicated | Adopt during component migration, not bulk literal replacement. Remove only after verified usage and approved palette mapping. |
| Low: icon/font coupling | Gravity available but unused in production; switch requires Material font; all entry fonts external | Later deliberate icon pass. Font failure can expose icon ligature text; verify fallback before replacing anything. No new dependency necessary. |
| Low: historic design docs | October 7 audit says no shared sheet/nav and contains older palette/theme findings | Keep historical document as baseline; use this report for current state. Do not treat old recommendations as current implementation facts. |

Semantic strengths worth preserving: Tracker labels wrap controls; required fields and URL/email/password types are native; cards are links; board scroll region is keyboard-focusable/labeled; show-all exposes expanded/controls state; Done uses native disclosure; sign-in errors have an alert role. Header active state is underlined as well as colored. Disabled controls use actual disabled states, not styling alone.

Other confirmed limitations: Builder has no main landmark, no tabpanel/tablist relationships, and no announced current step; generated state changes do not explicitly manage focus. Tracker's validation feedback is generally form-level rather than tied to individual invalid fields. Shared wordmark/menu wrapping has no elaborate responsive behavior; that simplicity is appropriate. Reflow at 200–400% zoom, long localized labels, long prospect titles, native-control contrast, mobile touch operation and screen-reader announcements remain verification needs, not confirmed failures here.

No current overlay/shadow/z-index problem justifies introducing an overlay infrastructure. Existing static apps, Supabase SDK and export libraries are functional dependencies, not design-system debt to replace. Shipping the full Gravity catalog is a potential asset-budget question only once icons are used; do not optimize an unused runtime asset on speculation.

## G. Recommended minimal shared architecture

**Layer 1 — foundations:** retain `tools/shared/tokens.css` as the primitive and semantic source. Add only approved UI typography, selected spacing/radii, border/focus and motion roles. A small shared base stylesheet can own theme-native control behavior and explicitly chosen baseline conventions; avoid importing Tracker's reset globally. Legacy aliases stay local until all consumers migrate.

**Layer 2 — shared UI:** keep `navigation.mjs`/`navigation.css` and icon helper. Introduce a small shared UI stylesheet for native button, text field/textarea/select, label/hint/error and feedback/surface presentation. Both static Builder markup and Tracker factories can apply its classes. Add shared JS only when genuinely shared behavior emerges. Tabs, dialogs and badges do not need generic modules simply to complete a catalog.

**Layer 3 — app components:** keep Builder focus selection, state/progress panel, revision bar, screen résumé/cover-letter renderers and exports local. Keep Tracker card/board/status/history/ingestion/duplicate UX and controller/data contracts local. Career Radar placeholder adopts shared page/surface rules as they become available; discovery is still outside scope.

No React, framework, monorepo, package at the repository root, CSS framework or token generation service is needed. Relative assets and static Pages deployment remain suitable. Do not split Builder's application logic merely to extract styles. Use explicit shared classes to reduce global selector collisions; avoid a specificity arms race or `!important` patches.

## H. Phased implementation roadmap

Each phase is a separate reviewable change, not authorization to implement. Effort estimates are relative engineering scope; design iteration is additional.

| Phase | Objective / scope / affected files | Dependencies | Risks and verification criteria | Effort |
| --- | --- | --- | --- | --- |
| 0. Approve reference contract | Select current Figma nodes; document primitives, semantic themes, component states and responsive widths; agree which specifications are final | Designer-provided source of truth | Prevent guessing or adopting obsolete frames. Review mapping against actual UI roles and contrast before code | Small |
| 1. Foundations and accessible states | Approved palette/semantics/type roles in `tokens.css`; focused base/theme additions; local alias compatibility; focus/on-accent roles; address readable light pairs | Phase 0 values and role decisions | Broad color impact. Verify both themes, text/fill/focus pairs, native controls, storage failure and saved theme on throttled reload; compare all current states | Medium |
| 2. Native controls and semantics | Shared button/control/feedback CSS; adopt Builder input labels and Tracker controls; local accessible tabs/chips; preserve IDs/handlers | Foundations; approved states | Medium interaction risk. Keyboard/screen reader, label click, Enter/Space, required/error/busy/disabled states; Builder generation/revision and Tracker dirty-save guards must remain intact | Medium |
| 3. Header independence | Scope generic switch selectors; consume shared semantics/type/box model; settle native theme/initialization only if observed issues require it | Shared foundation/control conventions | Small cross-suite cascade risk. Compare three apps at desktop/mobile/zoom, active links, focus, routes, persisted and cross-tab themes; auth stays local | Small |
| 4. Tracker adoption | Apply shared roles/density/surfaces to local board/editor/login/ingestion styles; keep lifecycle grouping/history/data behavior | Completed shared controls and Figma Tracker reference | Medium CSS risk. Synthetic board empty/populated/Done/Applied expansion, long text and horizontal scroll; edit/save failures/status/history/import/duplicates/handoff; no DB migration | Medium |
| 5. Builder-specific alignment | Approved narrow-input/wide-preview shells if specified; generation/revision layout and announcement polish; targeted inline UI extraction | Figma Builder states and responsive specs; stable shared foundations | Highest layout/DOM risk. Input/generation/error/retry and both previews; revision active-tab preservation; download package; preview/export boundaries. Keep document layout edits in separately verified slices | Medium; large if document layout changes are included |
| 6. Placeholder and measured cleanup | Replace dependency on entire Tracker CSS with small shared page/surface rules; remove verified obsolete aliases/styles only | Shared page foundations established | Low scope. Both themes, correct nav/heading/panel at narrow widths; confirm no discovery/API behavior introduced | Small |

Verification should reuse existing Tracker type/lint/tests and synthetic browser fixtures. Builder needs browser checks because it has no dedicated automated UI suite. Validate export artifacts when changes actually touch document styles or export definitions. Do not run hosted-data mutations to validate visual adoption.

## I. Figma implementation readiness

| Already available in code | Reasonable inference, to validate | Must come from approved Figma references |
| --- | --- | --- |
| Existing routes, workflow states, field IDs, token ownership, dark/light class/storage contract, font families, shared header and native control types | Both apps can share native button/control presentation; a small CSS layer is enough; app-specific widths should remain configurable | Exact lavender/cream/neutral primitive values and neutral progression; alpha treatments and semantic assignments for **both** themes |
| Current sizes, spacing, radii and component states | Preserve established data/interaction contracts during visual migration | Typography families/weights, role sizes/line heights/tracking, label casing and font files/loading policy |
| Screen previews separated from PDF/DOCX definitions | Exports should remain theme-independent unless explicitly redesigned | Component default/hover/focus/pressed/selected/disabled/loading/error states and text-on-fill colors |
| Existing mobile CSS and horizontal board scrolling | Wrapping navigation remains a reasonable default | Breakpoints, shell widths per Builder state, gutters, preview behavior, board/card density and narrow-screen adaptations |
| Gravity catalog and Material switch icons | Current assets can support a restrained icon pass | Approved icon choice, stroke/size/alignment and whether to replace existing Material icons |
| Current feedback/QA/revision states | Reuse established workflows rather than invent new ones | Feedback hierarchy, reduced-motion/loading treatment, and explicit boundary between screen document redesign and export redesign |

Simplest handoff: named Figma variables/collections and mode mappings, annotated type/component states, plus exact file/node links for approved Builder/header/Tracker reference frames. A small exported token table or reviewed JSON/CSV is sufficient; translate it into the existing CSS file with a mapping table and reviewable diffs. No automated sync pipeline is necessary. Use screenshots for comparison, not as a substitute for numeric values or state definitions. Ambiguous or missing mappings should stay explicitly unresolved.

## J. Open questions requiring product/design input

1. Which Figma file/nodes and variable collections are the approved implementation reference, and which areas are still exploratory?
2. What are the intended Builder input/generating/preview widths and mobile adaptations? The wider preview is not present in current code.
3. Does the upcoming design pass cover themed **screen document previews** only, or also PDF/DOCX document typography/layout? These are separate verification scopes.
4. Which component states and contrast-approved semantic mappings are final enough to implement first?

No decision about a framework, router, database rename, discovery workflow or token-management service is needed to begin the proposed incremental path.

## Report validation and boundaries

Source references and local document links were checked; repository whitespace validation was run. Historical audits were read for context but not used as a substitute for current source. This report provides a preliminary static assessment and a plan, not a visual/Figma fidelity review or accessibility certification. Runtime regressions were not retested because no runtime files changed. Implementation remains unstarted.
