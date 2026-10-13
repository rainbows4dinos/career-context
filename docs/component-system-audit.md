# nextchapter component-system audit

October 11, 2026 · Repository baseline: `e8147c5` (`update surface tokens`). Read-only audit; only this report was added.

Evidence labels used below: **Verified** means inspected live Figma data or current repository source; **Interpretation** is a design assessment; **Recommendation** describes future work, not implementation authorization. Readiness describes technical specification completeness, separately from design approval.

## A. Executive summary

**Verified:** the [Component System WIP](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=102-10517) contains **10 component sets, 61 variant components and 6 standalone components**. Its four organizing frames are Actions, Navigation, Inputs and Status. Buttons have the broadest state/size coverage; native-field visuals share a consistent structure. Navigation includes desktop and mobile compositions, but its mobile interaction and application destinations are incomplete. No standalone card, panel, prospect card, Kanban column, status-history, document-preview or duplicate-review component was found in this section.

**Approval:** all inspected families live under the explicitly WIP section; component/set descriptions are empty and no approval annotations were found. None can be called clearly approved or published on this evidence. Publication/release status was not established. Defined variants are evidence of specification, not permission to ship them.

The architecture remains suitable: one token source and navigation/theme module, with local Builder HTML/CSS/global handlers and Tracker DOM factories/controller code. A small opt-in shared stylesheet can serve native buttons, labels and fields; a framework, generic JavaScript component factory or build pipeline would add unnecessary scope. Keep workflow rendering and event handling local.

**Recommendation:** start with **native primary buttons, Lg size**, after settling the light focus treatment and narrow-width label behavior. Their default/hover/pressed/disabled colors, geometry and typography are substantially defined, and the same actions occur in Builder and Tracker. Do not start with the entire input library: error states and the field-focus geometry need decisions, and directly adopting its dark input-border mapping would weaken existing boundaries. Do not replace the working navigation with the incomplete mobile design.

### Current implementation, superseding older findings

Reviewed the [October 10 audit](nextchapter-design-system-audit.md), [Phase 1 report](nextchapter-shared-foundations-phase1.md), [shared navigation](nextchapter-navigation.md) and current code. The older reports are historical snapshots:

- [tokens.css](../tools/shared/tokens.css) now defines the live palette, 50 semantic roles, both modes, 15 current type roles and DM Serif Display / Inter / IBM Plex Mono families. Fonts load in all three entry pages. Most local component typography still uses literal sizes and legacy weights rather than role tokens.
- Current live and code surfaces are `surface/default → surface/raised` in both modes; raised is neutral/50 Light (`#FFFFFF`) and neutral/900 Dark (`#231D2B`); sunken remains neutral/200 Light (`#EFEBE7`) and neutral/950 Dark (`#15111B`). The Phase 1 report's earlier neutral/800 raised-surface mapping is no longer current.
- Both apps retain `--surface → --nc-surface-raised` and `--surface2 → --nc-surface-inset → --nc-surface-sunken`. Builder `--muted` is tertiary; Tracker `--muted` is secondary. Shared classes should consume `--nc-*` directly.
- Primary/revision fills now use dedicated primary bg/fg roles. Existing outlines in navigation, Tracker and Builder links use shared focus color/width/offset. Native `color-scheme` now follows the shared theme in Builder as well as Tracker/placeholder.
- Builder input outlines, label associations, div tabs, span chips and loading announcements were deliberately not migrated. These issues remain; they are not resolved by the foundation work.
- The theme contract remains dark default, `body.light`, storage key `theme`, origin-wide storage synchronization. Shared navigation routes remain module-relative; no mobile menu, About destination or suite-wide authentication was added.

## B. Live Figma inventory

Inspection used the Plugin API to read component properties, every variant's dimensions/state names, Auto Layout, text-style IDs, actual color-variable bindings and prototype reactions. Current primitives, all Theme aliases and all 15 text styles were retrieved separately. Screenshots were not used to infer values.

The Actions (`92:5336`), Navigation (`92:9370`), Inputs (`92:5347`) and Status (`92:5351`) frames explicitly select **Light** mode (`42:1`). Theme variables also define Dark (`42:2`), so semantic bindings are available in both modes; this is not evidence that every component was visually reviewed in Dark. No separate Theme variant axis or dark comparison composition was found here.

### Families, properties and states

Property names below omit Figma's generated `#…` suffixes. Sizes are inspected examples, not universal fixed widths.

| Family / live reference | Defined variants and sizes | Exposed properties | Coverage and omissions |
| --- | --- | --- | --- |
| [Button](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=53-220) | 24: Lg/Sm × Primary/Secondary/Tertiary × Default/Hover/Pressed/Disabled | Label; Show Icon L/R, both true by default; Size, Variant, State | Full four-state Cartesian set. No Focus or Loading variant, icon-only variant, danger-action variant or documented width/wrapping policy. |
| [Chip](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=62-285) | 6: Sm/Lg × Default/Hover/Selected | Size, State | No exposed label property, disabled/focus state, selection-group contract or click-to-selected prototype. |
| [Pill Tab Item](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-5012) | 3: Sm × Default/Hover/Selected | Label, Size, State | No focus/disabled variant. Hover and Selected have identical inspected fill/text treatment. |
| [Tabs/Pill/Sm](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-5019) | Standalone container with three tab-item instances | Tabs Slot | Example 276×28; no panel association, keyboard policy or responsive/more-items variant. |
| [Step Progress](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=77-137) | 3: Active/Upcoming/Completed | State | One step item, not a complete progress bar. No failure state, alternate orientation or stage-announcement contract. |
| [MainNavItem](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-9731) | 4: Default/Hover/Selected/Disabled | State | No label property or focus variant. Default/hover text assumes the header's lavender background. |
| Main Navigation Header: [Lg](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-3421), [Md](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-9721), [Sm/Default](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=102-10498) | Three standalone compositions: 1512×80, 1080×80, 390×45 | None | Named size examples, not a breakpoint specification. Lg/Md include app links, About, Logout and theme switch; Sm shows wordmark and Nav Button only. No open mobile menu or menu-button reaction. |
| [TextField](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=53-589) | 5: Lg × Placeholder/Filled/Hover/Focus/Disabled | Show Label (true), Show Helper Text (false), Show Icon R (false), Value; Size, State | No error/invalid, read-only, password/date/URL-specific or compact state. Native input types can preserve browser behavior without custom variants. |
| [TextArea](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=61-183) | Same five Lg states | Same label/helper/right-icon/value properties | Example 280×126 including label; no resizing/min/max-height or overflow policy. No invalid state. |
| [Select](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-9223) | Same five Lg states | Show Label, Show Helper Text, Value, Show Search (false); Size, State | Closed field only; right arrow present, optional left icon hidden. No options popup, search behavior, multi-select or invalid state. Preserve a native select rather than invent a custom combobox. |
| [Input Label](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=53-501) | Standalone | Required (false), Label | Optional asterisk is defined. HTML association/required semantics belong to implementation, not the visual component. |
| [Switch-Mode](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=81-397) | 2: Light Active / Dark Active | State | Click transitions between the two states. No focus/disabled variant; preserve existing native button and theme persistence. |
| [Alert](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=53-638) | 4: Success/Danger/Warning/Info | Show Icon L (true), Text, Variant | No dismiss/action/busy variant. Text can wrap and height hugs, but root example width is fixed at 114; fluid callout width is not specified. |
| [Load Spinner](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=81-1063) | Standalone, 28×28 | None | Two track/spin graphics; no animation/reduced-motion/progress-value definition or alternate-size variant. |

The `⌘ K` annotation (`92:5335`) is only text. No command palette or shortcut behavior was found in this section. There is no separate status-badge family; Alert is the feedback family and Step Progress contains a nested circular badge. Do not equate either with Tracker's lifecycle badge.

### Geometry, typography and semantic bindings

| Pattern | Verified layout/dimensions | Type styles | Actual role bindings |
| --- | --- | --- | --- |
| Button Lg | Horizontal Auto Layout, centered contents; width hugs; fixed height 40; 16px horizontal padding, gap 8, radius 8, 1px border; 16px icons; sample width 131 | UI/Button: Inter Medium 16/16 | Primary bg/hover/pressed + fg/border; corresponding Secondary roles. Disabled uses action/disabled/bg and fg, without stroke. |
| Button Sm | Width hugs; fixed height 28; padding 12 horizontally, gap 6, radius 6; 12px icons; sample width 99 | UI/Button Sm: Inter Medium 12/12 | Same state role mappings as Lg. |
| Tertiary button | Same size geometry | Same button roles | Default transparent action/tertiary/bg, tertiary fg/border. **Hover and Pressed switch to Secondary hover/pressed fills, fg and border**, not speculative tertiary hover tokens. |
| Chip | Horizontal; sample Sm 68×28, padding 8 vertical/12 horizontal; Lg 91×40, padding 12/16; radius 100. Sm hugs both axes; Lg fixes height. Declared Lg padding plus line box does not simply sum to its fixed height; verify rendered alignment before copying to CSS. | UI/Button Sm or UI/Button | Default transparent, text/secondary, border/subtle; Hover border/control; Selected action/primary/bg, fg, border. |
| Pill tab | Item 90×22, horizontal hug width/fixed height, padding 4/20, radius 9999; container horizontal hug width/fixed 28 height, padding 2, zero item gap, radius 999 | UI/Button Sm | Default text/primary; Hover/Selected action/secondary/bg with action/primary/fg. Container surface/default and input/border. |
| Fields | Vertical root, gap 6; label 24px tall; input 280×40, Fill width, fixed height, padding 8/16, gap 8, radius 8, 1px inside border. Root example 280×70. Helper row is optional and hidden by default. TextArea root fixes 126 height; its input fills the remaining 96. | UI/Label 16/24; Body/Default Inter Regular 16/24; Body/Small 12/20 helper | input/bg, input/border; Placeholder text/placeholder, Filled text/primary, Hover/Focus value text/muted; Hover input/hover. Disabled changes label/value/helper to action/disabled/fg but retains input bg/border. |
| Field focus | Focus wrapper and inner control share bounds: 280×40 (or 280×96); wrapper padding 0, outside stroke 2px focus/ring; child at 0,0 with 1px inside border | Same field styles | Focus color bound. **No 2px local-surface gap is encoded**, unlike [current global guidance](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=45-656). |
| Input Label | Horizontal Hug/Hug, gap 2, left padding 2; sample 44×24; asterisk hidden by default | UI/Label: Inter Medium 16/24 | Label text/primary; required asterisk text/secondary. |
| Step item | Horizontal Fill/Hug, gap 8; example 126×32; nested 32px circle; 20px number/check icons | UI/Label 16/24 | Active/Completed circle action/primary/bg; Upcoming action/disabled/bg. Active/Completed label text/primary, Upcoming text/muted. |
| Switch | Fixed 48×28, radius 999, 1px border; manually positioned 20px thumb, 12px moon/sun | No text | Light Active uses primary bg/border/fg; Dark Active secondary bg/border/fg. These state names do not replace the Theme collection's mode mapping. |
| Alert | Horizontal fixed-width/Hug-height; sample 114×36, padding 8, gap 4, radius 8, 1px border; 16px icon; message Fill width with HEIGHT text resizing | UI/Badge: Inter Medium 12/20 | success/danger/warning/info bg, fg and border by variant. |
| Spinner | Fixed 28×28; 2px track stroke and foreground spin graphic | None | loading/bg and loading/fg. No motion reaction was present. |

Prototype button Default→Hover and Hover→Pressed use Smart Animate / Ease In And Out at approximately 150ms. Chip and Pill Tab Item have default hover transitions; these are not complete selection/keyboard specifications. Switch has click-to-opposite-state transitions at the same duration. Existing native browser keyboard behavior need not be designed as a Figma prototype to remain valid. Missing button Loading art also does not require inventing a spinner: preserve existing disabled/text workflows.

### Navigation-specific findings

Lg/Md headers use a lavender action/secondary/bg surface with a subtle stroke, horizontal **NO_WRAP**, centered navigation, clipped content and absolutely positioned wordmark/utility groups. Lg horizontal padding is 80, nav gap 40; Md padding is 40, nav gap 20. Neither defines min/max width or a breakpoint. These sample widths cannot safely become media-query thresholds without a decision about collision and content widths.

The desktop wordmark uses H2 (DM Serif Display Regular 28/36); mobile uses H3 (21/32). Mobile is a 390px sample with padding 6 vertical/20 horizontal, SPACE_BETWEEN alignment and a 28px Nav Button. No theme switch, app links, About or Logout are visible there until an as-yet undefined menu is opened. The desktop default nav item is 92×32; Hover/Selected become 94×34 when borders participate in layout. This raises a layout-shift risk if copied literally; it is not proof of a browser regression.

MainNavItem default/hover text uses action/secondary/fg (neutral/900 in both modes). It passes on the intended lavender header, but fails at 1:1 on a dark neutral/900 surface if extracted as a context-free nav class. Selected has a primary fill. Keep this family context-bound or clarify its theme-independent text role.

### Current type reference

Live styles still match the October 11 scale: Display 50/64; H1 38/48; H2 28/36; H3 21/32; H4 16/24 (all DM Serif Display Regular). Inter roles: Body Large 21/32, Default 16/24, Small 12/20, Caption 12/16 (Regular); UI Title 21.33333396911621/28 (Semi Bold), Label 16/24, Button 16/16, Button Sm 12/12, Badge 12/20 (Medium). Meta is IBM Plex Mono Regular 12/16. Tracking is zero for all 15. This audit does not apply these styles to existing app headings or document exports.

## C. Figma-to-code mapping

Source references below use current line numbers and verified functions. Career Radar currently imports Tracker's stylesheet for its placeholder panel and typography; it has no tracking or generation UI of its own.

| Figma pattern | Existing implementation and locations | Similarities / differences and missing states | Reuse / effort |
| --- | --- | --- | --- |
| Button | Builder `button.primary`, `button.secondary`, `.revise-bar button` ([HTML](../tools/resume-tailor.html), 125–141); generation 201, downloads/start-new 220–221, revision 232, retry construction 663. Tracker [CSS](../tools/career-radar/styles.css), 31–36; [UI](../tools/career-radar/ui.js) `button()` 13, submit/save/status buttons 128/165; [ingestion](../tools/career-radar/ingestion-ui.js), 17/19/47. Radar: theme button only. | Native semantics already correct. Primary role pair matches; sizes are local (Builder 14px and padding/opacity hover; Tracker inherited 15px and border hover). Local secondary is transparent, unlike Figma's lavender-filled Secondary. No pressed style or role-based disabled fill; generic pending disables remain functional. | Strong shared CSS candidate; handlers/type/disabled state stay local. Small–medium; layout rules and the separate revision selector must be preserved. |
| TextField + Label | Builder `.field`, `.field-row`, `label`, `input[type=text]` (56–68), job fields 175–189. Tracker `field()`/`selectField()` (UI 80/90), login labels ([entry](../tools/career-radar/index.html), 32–33), styles 62–66. Radar: none. | Both native and full-width, but labels differ in casing/weight/size and control padding. Builder labels are siblings without `for`; required markers lack native required attributes. Tracker wraps labels and uses native required/types. Both current controls use border/control, not the weaker dark Figma input/border. | Shared appearance after invalid/focus decisions; keep IDs/names/types and local form handling. Medium, with Builder semantics a separate task. |
| TextArea | Builder job description/notes (185/199), revision note 231; min heights 140/72/80, resize vertical. Tracker `field(...,'textarea')` at UI 107/111/125; 120px minimum, resize vertical (CSS 64). Radar: none. | Figma's 96px control example, 16px body and 8/16 padding differ. No agreed resize, overflow or error policy. Revision Enter/Shift+Enter behavior is application-local. | Share base control CSS with fields; retain per-field heights and key handler unless separately approved. Medium. |
| Select | Tracker work arrangement/current status through `selectField()`; native options and blank “Not specified”; CSS 63. Builder/Radar: none. | Closed Figma visual matches the role, but no popup/search specification exists. Browser open-list/keyboard behavior already works. | Shared native select styling can accompany controls; no custom menu or search widget. Small–medium. |
| Chip | Builder `.tog` (72–74), `renderChips()` 384 and `toggleFocus()` 402; canonical parsed values populate `focusSelected`. Tracker lifecycle badge is a noninteractive span (UI 53; CSS 59), not a chip. Radar: none. | Builder selected lavender selection roles differ from Figma yellow action roles; 13px vs 12/16. Spans have click handlers only, no keyboard focus or exposed pressed state. | Shared visual shell possible later; selection/parser/group behavior stays Builder-local. Semantic fix small–medium; full visual adoption medium. |
| Pill tabs | Builder `.tab-bar`, `.tab`, `.tab-actions` (94–101), div tabs (217–218), `showTab()` 417. No tabs in Tracker/Radar. | Existing underline tabs plus download actions differ substantially from the separate 28px pill strip. No native focus/keyboard or tab/panel ARIA relationships. | Local Builder behavior first; avoid a generic shared tabs JS module for one usage. Medium; preserve activeTab for revision. |
| Step Progress | Builder `.step-bar`/`.step` (77–80), stage divs 163–167, `setStep()` 408. Tracker/Radar: none. | Existing 3-stage underlines differ from Figma circles/labels; Completed currently success color, not primary yellow. No current-step semantics/announcement. | Builder-local composition of optional future visual classes. Medium; preserve display and generation transitions. |
| Main navigation / nav item | All three: [navigation.mjs](../tools/shared/navigation.mjs), 1–49; [navigation.css](../tools/shared/navigation.css), 2–7. Native links, `aria-current`, module-relative routes, wordmark, theme button; wrapping two-row header. Tracker's local Board/Add/Sign out nav is separate (entry 25). | Existing neutral background and underlined active link differ from Figma lavender bar/pills, centered wordmark placement and fixed-height samples. Figma About has no destination; Logout is currently Tracker-local. Mobile menu absent from code and incomplete in Figma. | Already shared; styling migration is a later isolated task, not new routing/auth behavior. Medium–large once mobile/utilities are settled. |
| Switch-Mode | All three: native theme button (module 24–47), switch styles (CSS 8–46). | Current 52×28 track/20px thumb/14px Material icons differs from 48×28/12px icons and filled Figma track. Accessible label/pressed state and keyboard semantics are already present. | Keep shared JS unchanged; future scoped geometry/icon/style change only. Small, but verify theme synchronization. |
| Alert | Builder `.tailor-note`, `.revised-note`, QA warning template in `renderPreview()` (867 onward), handoff role=status (170), generation errors (656), native alerts. Tracker notice/login error (entry 27/34), save/status/handoff feedback (UI 127/131/168), ingestion status/live duplicate region (ingestion 20–21). Radar: none. | Feedback is real but visually inconsistent; Tracker errors use danger fg on selection bg, not an Alert variant. Builder callouts often larger and long-form; Figma fixed 114px root needs a width policy. Announcement urgency is workflow-specific. | Shared visual severity classes; retain text, timing, live roles and recovery actions locally. Medium. |
| Load Spinner | Builder `.spinner` (84) and `.revise-spinner` (144), 28/14px, 750ms CSS rotation. Tracker uses textual pending feedback and busy/disabled fields, no spinner; Radar none. | Figma defines only the 28px track graphic and loading roles; no motion/small variant. Existing accent/control-border colors differ from dedicated loading roles. | Optional shared visual spinner later; generation stages and live status remain local. Small visual change; motion/announcements separately specified. |
| Cards/surfaces (no family found) | Builder `.card` and document preview cards; Tracker `.panel`, `.column`, `.prospect-card` (CSS 38/46/56; UI 29/97); Radar `.panel.narrow` ([placeholder](../tools/career-radar.html), 20). | Shared surface tokens already resolve; panel radius remains legacy 10 and paddings differ. No Figma card variants, spacing or interaction contract to map. | A base surface convention may become shared; preserve prospect links, board columns, previews and shell widths. Do not manufacture a Card component from token availability. |

App-specific patterns verified in code but absent from this library: board grouping/Applied expansion/Done disclosure; status history; ingestion provenance and duplicate decisions; generation/error-retry stages; résumé and cover-letter renderers; revisions and highlights; PDF/DOCX/ZIP exports. Their visual primitives may converge, but these are not candidates for one generic workflow component.

## D. Implementation readiness matrix

“Ready” below means sufficient technical detail for the indicated narrow scope. It does **not** mean approved/published. All WIP component adoption still needs a separately authorized implementation task. Native keyboard, label association and browser popup conventions can supply semantics without invented Figma widgets.

| Family / scope | Status | Justification and blockers |
| --- | --- | --- |
| Input Label visual style | Ready | Text style, required marker/property, color and simple layout are explicit. Native HTML association and required attributes can be established conventions; no interaction variants are needed for a static label. |
| Primary/Secondary Button | Needs clarification | Four states/two sizes/roles are defined, and native keyboard/disabled semantics can be preserved. Light focus color fails required contrast; no narrow-label/wrapping policy. Existing transparent secondary actions need an explicit mapping before adopting the filled Secondary. Loading art is not a blocker if existing disabled/text behavior is retained. |
| Tertiary Button | Needs clarification | Hover/Pressed role changes are verified, not missing. Default subtle boundary is low contrast; clarify when a visible boundary is necessary. Focus and label-width questions apply. |
| TextField | Needs clarification | Default/filled/hover/focus/disabled are defined. Missing invalid/helper presentation, low dark boundaries and contradictory focus gap block wholesale replacement. Keep password/URL/date inputs native; their browser internals need not be redesigned. |
| TextArea | Needs clarification | Same field blockers plus resizing/min-height/overflow and fixed-height sample inconsistencies. Long complete job descriptions must remain editable and accessible. |
| Select closed native field | Needs clarification | Same border/focus/error blockers. Browser options popup is an acceptable established convention; lack of custom menu need not block native styling. Search behavior is not ready and should not be introduced. |
| Chip | Needs clarification | Sizes and selected/hover colors exist. Confirm multi-select/toggle intent, focus/disabled treatment and fixed-size/padding interpretation. Native toggle buttons can provide semantics; no need for a generic selection engine. |
| Pill tab item/container | Needs clarification | Default/hover/selected exists, but hover and selected are visually identical, height is 22px, focus is absent and no panel/group relationship is specified. A standards-based local tab implementation can define keyboard mechanics without copying a missing prototype. |
| Step Progress | Needs clarification | Three stage visuals exist; no complete responsive composition or generation-error-stage treatment. Preserve existing noninteractive progress logic; native status/current-step semantics can be added separately. |
| MainNavItem | Needs clarification | Defined on a specific lavender background; cannot be reused on arbitrary dark surfaces. Focus and state-size change need resolution. |
| Main Navigation Header | Exploratory | Desktop composition exists, but mobile open state/links/switch/access to utilities and width thresholds are absent. About and Logout would add or move behavior. Do not replace wrapping navigation until settled. |
| Switch-Mode | Needs clarification | Two clickable visual states and 150ms transition exist. Existing native button supplies semantics; focus follows the unresolved light ring. Confirm its placement/access in the mobile header before that migration. |
| Alert | Needs clarification | Four severities and both-mode role aliases exist with passing fg/bg pairs. Fluid width/long-copy layout and optional action placement remain undecided. Announcement urgency can stay local; no generic alert JS is necessary. |
| Load Spinner | Needs clarification | Graphic/tokens exist, but timing, reduced-motion presentation and 14px revision counterpart are not specified. Existing CSS motion could be preserved explicitly, rather than claimed as Figma-approved. |
| Basic cards/surfaces | Needs clarification | Used in code, but no standalone family in this section. Token roles alone do not define component radius, padding, density or states. |
| Search-enabled Select / command shortcut | Not applicable | No current product need or behavior contract; optional icon/text annotations do not authorize a new search/command workflow. |

No missing browser-native hover/keyboard/validation popup is grounds to replace native elements with custom JavaScript widgets. Error visuals and contrast decisions are design gaps; HTML label association, tab semantics and native button activation are implementation responsibilities.

## E. Accessibility and interaction assessment

### A — confirmed semantic/behavioral issues from current source

| Finding | Evidence | Future semantic correction, separate from appearance |
| --- | --- | --- |
| Builder labels not associated | Labels at HTML 175/179/184/188/198 are siblings without `for`; revision textarea 231 has no associated label. | Associate labels with existing IDs; supply an accessible revision label. Preserve field IDs and job handoff bindings. |
| Required status not native in Builder | Asterisks at 175/184; inputs have no `required`; `goTailor()` 460 checks title/JD and uses alert. | Expose required semantics and associate validation feedback while preserving current generation guard. Do not create a form submission side effect accidentally. |
| Tabs mouse-only | Divs with onclick at 217–218; `showTab()` 417 only updates classes/display. No tablist/tab/tabpanel, selected state or keyboard handling. | Local focusable tab controls and related panels; preserve activeTab and revision destination. Follow the [W3C tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) for keyboard/selection relationships. |
| Chips mouse-only; selection not exposed | `renderChips()` 394 creates onclick spans; `toggleFocus()` 402 updates only class and array. | Native toggle buttons with exposed pressed/selection state; preserve canonical parser values, multi-selection, order and start-over reset. |
| Generation/revision feedback not live | loadStatus/loadSub divs 209–210; reviseStatus 226–229; neither has live/status semantics. `setStep()` changes display but not current-step semantics. | Local status announcements/current-step indication and deliberate transition focus policy. Do not announce every streamed token or move focus continuously. |
| Field errors/helpers not programmatically linked | Builder alerts/generation retry; Tracker UI field wrappers and form-level feedback; ingestion provenance appended with `.field-origin`. No input-level describedby/invalid/error link in these factories. | Stable IDs and associations where relevant; retain existing status/alert roles. Treat generic form failure differently from a particular invalid field. |

Strengths to retain: native action buttons; native Tracker label wrapping/required/email/password/URL/date/select controls; prospect link cards; keyboard-focusable labeled board region; native Done disclosure; Applied expand button with expanded/controls attributes; Tracker live status/history/duplicate regions and `aria-busy`; native shared theme button with accessible name/pressed state; shared `aria-current` route indication. Tracker's [busy controller](../tools/career-radar/app.js), 60–67, disables fieldsets and logout while preserving a retrieval-cancel exception. A CSS migration must not interfere with these behaviors.

The two top-level Tracker headers warrant a landmark-tree review, but duplicate banner exposure was not confirmed in a new browser/accessibility-tree test. Likewise, zoom/reflow, touch target spacing, screen-reader announcements and cross-browser native popups remain untested in this audit.

### B — visual styling findings and current contrast

Shared outlines are now 2px/2px on links/header and Tracker focus-visible. Builder inputs/revision textarea still suppress outline and change their border to the legacy link accent (64/138); generic Builder buttons have no explicit shared focus-visible rule. Browser-default button focus is not proof of missing focus, but needs measurement before replacing appearance/reset rules. Focus/pressed/disabled states must be evaluated together, not only the default sample.

Calculated from freshly retrieved, unrounded sRGB primitives/aliases. “Current neutral surfaces” means page, raised/default and sunken; Dark raised/default now use neutral/900. Normal text requires 4.5:1, large text 3:1, necessary non-text indicators generally 3:1. See [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Disabled components and decorative borders have different applicability; the table is not a complete WCAG claim.

| Live semantic pair (minimum where stated) | Light | Dark | Assessment |
| --- | --- | --- | --- |
| text/primary over current neutral surfaces | 13.81:1 | 15.57:1 | Pass for stated pair |
| text/secondary over current neutral surfaces | 7.42:1 | 13.81:1 | Pass for stated pair |
| text/muted over current neutral surfaces | 5.02:1 | 5.91:1 | Pass for stated pair |
| focus/ring over current neutral surfaces | 2.64:1 | 7.50:1 | Light below threshold |
| border/control over current neutral surfaces | 3.44:1 | 5.91:1 | Pass for stated pair |
| border/subtle over current neutral surfaces | 1.27:1 | 1.86:1 | Both below threshold; necessary boundaries only |
| action/tertiary/fg over current neutral surfaces | 7.84:1 | 5.23:1 | Pass for stated pair |
| action/primary/fg / action/primary/bg | 12.82:1 | 12.82:1 | Pass for stated pair |
| action/primary/fg / action/primary/pressed | 8.20:1 | 8.20:1 | Pass for stated pair |
| action/secondary/fg / action/secondary/bg | 10.93:1 | 10.93:1 | Pass for stated pair |
| action/secondary/fg / action/secondary/pressed | 5.23:1 | 5.23:1 | Pass for stated pair |
| text/placeholder / input/bg | 3.87:1 | 4.57:1 | Light below threshold |
| text/muted / input/hover | 5.02:1 | 4.74:1 | Pass for stated pair |
| input/border / input/bg | 3.87:1 | 2.12:1 | Dark below threshold |
| input/border / input/hover | 3.44:1 | 1.49:1 | Dark below threshold |
| action/secondary/fg / surface/default | 16.38:1 | 1.00:1 | Dark below threshold |
| success/fg / success/bg | 7.25:1 | 8.97:1 | Pass for stated pair |
| danger/fg / danger/bg | 7.17:1 | 8.03:1 | Pass for stated pair |
| warning/fg / warning/bg | 6.88:1 | 9.71:1 | Pass for stated pair |
| info/fg / info/bg | 15.70:1 | 7.50:1 | Pass for stated pair |

Important consequences:

- The old dark tertiary 4.19:1 finding was against neutral/800. On **current** raised/default neutral/900 it is **5.23:1**; there is no current standard-panel failure for that role. Against input/hover neutral/800 it would still be 4.19:1, so arbitrary contextual reuse is unsafe.
- Light focus/ring is 2.98:1 on the page and 2.64:1 on sunken; this remains unresolved. The outside 2px field stroke also omits the global 2px surface gap. Settle color and geometry before migrating fields or adding a shared button focus treatment.
- Placeholder default fails in Light at 3.87:1. Figma Hover/Focus value text actually switches to text/muted, which passes on hover backgrounds (5.02 Light / 4.74 Dark); do not apply the earlier generic placeholder-hover failure to this specific variant.
- Dark input/border remains 2.12:1 on input/bg and 1.49:1 on hover. Current app fields use border/control instead. Copying the Figma input role wholesale would regress the declared boundary contrast.
- MainNavItem neutral/900 text is 10.93:1 on the lavender header but 1:1 on dark default surface. A shared nav-item class needs its specified parent context.
- Filled primary/secondary buttons and four Alert fg/bg combinations pass static text checks. Existing component opacity hovers/disabled handling and callout backgrounds were not exhaustively recalculated; do not infer full state compliance from token pairs alone.

Touch-target assessment: Figma Sm buttons/chips and Switch are 28px high; Lg buttons/chips 40; inputs 40; mobile Nav Button 28. Pill Tab Item is only 22 high. [WCAG 2.2 target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) uses 24×24 with spacing and other exceptions. The 22px example needs an actual target/spacing assessment; it is not automatically a failure, nor does a 28px bounding box automatically certify every rounded target. Prefer comfortable targets where layout permits; do not quietly invent a new size scale during implementation.

## F. Minimum shared architecture recommendation

**Recommendation, not created:** a small `tools/shared/components.css` is sufficient for opt-in visual conventions: native button base/variants/sizes, field/textarea/native-select appearance, label/helper presentation, and later simple severity/surface styles. Use a suite-specific prefix such as `.nc-button`, `.nc-button--primary`, `.nc-button--lg`, `.nc-field`, `.nc-control`, `.nc-label`, `.nc-feedback--danger`. These are proposed names, not existing components.

Consume `--nc-*` semantic/type roles directly. Keep `tokens.css`, icon helper and navigation module as the existing foundation; no second token namespace, package, dependency, global reset, theme provider or generic visual JS factory. Builder can opt in through static classes; Tracker can apply classes in existing `button()`/`field()` factories. Icons may use the existing [Gravity helper](../tools/shared/icons.mjs), with decorative/action labeling; there is no need for a second icon package. Replacing Material switch icons is a separate decision.

Specificity and naming risks:

- Builder `button.primary`, `.revise-bar button`, `.tab-actions button.primary`, global `label`, `input[type=text]`, `textarea` and inline heights compete with opt-in classes. Tracker styles all `button,input,select,textarea`; its `.primary` and global focus rule are broad. Moving a stylesheet later cannot override every more-specific selector.
- On adoption, remove/redirect only the shared presentation declarations for the opted-in consumer; keep local width, flex placement and workflow layout rules. Retain legacy classes for unmigrated consumers. Avoid escalating specificity or using `!important` as a migration strategy.
- Keep header selectors independent of shared action-button classes; navigation's generic `.theme-toggle`/`.toggle-*` names and app aliases already create coupling. A future header pass can scope these, but button adoption must not change the theme switch.
- Preserve inherited/body alias resolution and native `color-scheme`. Keep component-owned color/state rules distinct from app-owned field grids, shells, preview documents and responsive board scrolling.

Share CSS where actual repetition exists. Keep Chip group state, tabs, step orchestration, board/history/ingestion and document render/export functions local. A simple surface utility can eventually share background/border/radius conventions; it must not collapse prospect cards and document previews into one behavior abstraction.

## G. Incremental adoption roadmap

Effort is relative: Small is a focused style/markup change; Medium combines multiple states/consumers; Large includes new interaction/responsive decisions. These are recommendations only, not permission to start them.

| Phase / objective | Scope and Figma references | Likely files | Dependencies / risks | Verification / effort |
| --- | --- | --- | --- | --- |
| 0. Close actual blockers | Button focus/long-label policy; input contrast/invalid/focus gap; header mobile/utilities. References Button `53:220`, field Focus `53:584`, color guidance `45:656`, header `102:10498`. | Figma decisions; separately authorized token sync if approved roles change | No app component refactor; do not silently substitute colors. Scope each decision to the next component family. | Re-read live aliases and state definitions; measure both modes. Small design task. |
| 1. Native primary buttons | First task below: Primary/Lg default/hover/pressed/disabled and established keyboard focus. | Proposed components.css; Builder button selectors/markup; Tracker styles and button/submit creation; entry stylesheet links | Focus/label policy agreed; preserve type/onclick/listeners/disabled/width and existing theme button. Avoid secondary-role interpretation. | Both themes, Enter/Space, pointer states, disabled/busy, long labels, mobile layouts; synthetic sign-in/save/status/ingestion/handoff and Builder generation/revision/download checks. Small–medium. |
| 2. Builder semantics independently | Label association/required feedback; chip native controls; then local accessible tabs/announcements as separate small patches. Figma Label `53:501`, Chip `62:285`, Tabs `92:5012`, Step `77:137`. | Builder markup/renderChips/toggleFocus/showTab/setStep only as authorized | Does not require full visual redesign. Preserve parser data, focusSelected, activeTab, handoff IDs and generation/revision transitions. | Label click, keyboard-only chip/tabs, screen-reader selection/status, start-over, active-tab revision and mock generation. Medium across separate reviews. |
| 3. Native field visuals | TextField/TextArea/Label; native Select skin where needed. References `53:589`, `61:183`, `92:9223`. | Shared stylesheet; local field CSS/markup; Tracker field factories and entry links | Approved errors/borders/focus; preserve native types/required, textarea resizing and local heights. Do not force every field to the 280px sample. | Empty/filled/hover/focus/disabled/invalid, helper associations, complete long JD editing, password/URL/date/select behavior, grid collapse, failed-save draft and ingestion/cancel. Medium. |
| 4. Other button roles / feedback | Secondary/Tertiary and Alert presentation, with optional agreed surface convention. | Shared stylesheet, local callouts/actions; possibly placeholder styles only after a surface spec | Resolve transparent current secondary mapping, Alert width/long-copy and necessary borders. Severity appearance must not determine live-region urgency automatically. | Both-mode all states, long messages, success/error/retry, duplicate save decisions, disabled/cancel behavior. Medium. |
| 5. Shared header visual migration | Header/nav item/switch after mobile open/utility behavior is defined; `92:3421`, `92:9721`, `102:10498`, `81:397`. | navigation.css; navigation.mjs only if a separately approved menu requires behavior; all entries | Highest cross-suite visual risk. Preserve existing URLs/auth/theme storage. Do not infer About or global Logout from an example. | Three apps, active/reload/Pages-prefix routes, dark/light/cross-tab/storage failure, menu keyboard/escape/focus, narrow-width collision and touch targets. Medium–large. |
| 6. Local progress and surfaces | Approved step/spinner/chip/tab visuals; app-specific board/editor/preview alignment only when their designs exist. | Builder local styles/renderers; Tracker CSS/UI; shared primitives only when reused | Preserve generation states, Done/Applied grouping/history, documents and exports. Do not bundle a Builder width/layout redesign. | Synthetic end-to-end workflows, retry/revision/tab state, reduced motion, responsive long content; actual package validation if document/export boundaries are touched. Medium in separate slices. |

## H. Decisions requiring designer input

1. Which **specific WIP family/state subset** is approved for adoption next? Publication or existence alone does not establish approval.
2. For first primary-button adoption: what light focus color/treatment should meet required contrast, and should long labels wrap or retain a minimum single-line width? The global 2px ring + 2px gap exists; no new general focus system needs inventing.
3. For fields: should the focus wrapper encode the global 2px gap, and how should invalid controls/helper messages look? Approve a dark boundary role and Light placeholder treatment before replacing stronger current field styling.
4. Before secondary actions migrate: should current transparent Cancel/Start New/Send actions use Figma Tertiary or lavender Secondary? Their visual names currently have different meanings.
5. Before chips/tabs migrate visually: confirm Chip's multi-select toggle usage/disabled treatment and whether tab hover should remain identical to selected; settle the compact target and fixed-height/padding discrepancies.
6. Before feedback migrates: what fluid-width/long-message convention should replace the 114px Alert example? No dismiss/action behavior is required unless a real workflow needs it.
7. Before header migration: define mobile open menu and access to app links/theme/utilities; decide whether About/Logout are in scope and their destinations/auth ownership; define content-driven width thresholds. Three example canvas widths do not specify these behaviors.
8. Before spinner/progress styling changes: confirm whether existing 750ms rotation and the 14px revision spinner are retained, and specify reduced-motion/stage-error presentation if those visuals are adopted.

No question about a new framework, database, generic component factory, build pipeline or custom select is necessary. HTML associations, native key activation and local tab semantics can follow established standards; they are not missing visual design decisions.

## I. Recommended first implementation task

**Implement shared native Primary/Lg button presentation only**, once the focused approval/focus/long-label decisions above are resolved. This is the strongest multi-app reuse opportunity with explicit four-state art and safe native semantics. A complete native-control migration is premature because input invalid/focus/border definitions remain inconsistent. The label visual alone is technically ready, but does not resolve as much cross-app inconsistency as primary actions.

Proposed scope: one opt-in button base plus Primary/Lg styling, consuming current action/type roles and the approved focus treatment. Adopt existing primary submit/generate/download/revision actions in Builder and Tracker in a reviewable patch. Keep app-local full-width/inline placement. Do not change Secondary/Tertiary, tabs, chips, fields, header/switch, card CSS, business logic or exports. No new icon is required; no loading spinner variant is invented.

Acceptance criteria:

- Primary default/hover/pressed/disabled and size/type definitions match the approved subset, in both modes. Focus is visible, unclipped and measured against its actual adjacent backgrounds. Approved long-label behavior works at narrow widths.
- Controls remain native buttons with their existing submit/button types, IDs, listeners/onclick, disabled/pending behavior, ordering and labels. Form submits, retrieval Cancel and Tracker draft guards behave identically.
- Builder Generate, retry, active-tab revision, Start New and actual download package remain functional; unrelated secondary styling stays unchanged. Tracker authentication, create/edit/save/status/history, ingestion/duplicates, board and handoff remain functional using synthetic fixtures.
- All three entry routes/theme preference and active navigation remain unchanged; the theme switch is not accidentally styled as a primary action.
- Check stylesheet cascade and keyboard/pointer states at desktop/mobile widths, both themes and relevant zoom/long-content cases; run existing scoped checks. No framework/dependency/database/token-architecture change.

## Method, validation and limits

Current source and previous reports were inspected; live Figma reads covered all inventoried variant definitions, properties, principal layout/text/color bindings, targeted nested focus/icon/spinner geometry, mode overrides and current foundations. Broad initial responses exceeded the tool's 20KB return limit; narrower reads succeeded. No values were approximated from screenshots and no Figma writes were performed. Library publication/approval metadata, undocumented behavior and future responsive states remain unknown.

This audit used source inspection and fresh static contrast calculations, not new browser, assistive-technology, hosted-data or API regression tests. Previously recorded foundation/surface browser checks are historical evidence, not tests rerun for this report. No application test suite was rerun for a report-only change. All 100 current live semantic mode mappings match the CSS. Local file links, reference locations and report whitespace were checked; `git diff --check` passed. Application code, CSS, tokens, routes, configuration, dependencies, Supabase records/schema, canonical career sources and generated application artifacts were left unchanged. Stop after this audit; implementation requires the next authorized task.
