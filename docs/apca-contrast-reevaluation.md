# nextchapter APCA contrast reevaluation

October 11, 2026 · Repository baseline: `bb133db` (`design token audit, fixed light-mode focus ring contrast`). Read-only evaluation; this report is the only repository addition. The [original component-system audit](component-system-audit.md) remains unchanged.

**Evidence labels:** **Measurement** is a calculated color-pair result; **Verified** is live Figma or repository-source evidence; **Guidance** is referenced APCA/W3C material; **Interpretation** is a contextual design judgment; **Recommendation** is proposed future work. None of the recommendations authorizes implementation.

## A. Executive summary

APCA changes the priority of the findings rather than simply clearing the previous audit's failures.

- **Resolved:** live Figma Light `focus/ring` now aliases `secondary/700`, `#523394`. CSS matches. Its signed contrast is **+87.43 Lc** against page/input backgrounds and **+90.97 Lc** against raised panels. The old light-ring failure must not block implementation.
- **Acceptable as supplementary text:** the Figma Light placeholder is **+64.42 Lc**, Inter 16px/400, in a labeled field. This is a reasonable internal design choice for a redundant example, although its **3.87:1 WCAG ratio remains a conformance concern**. Dark placeholder **−33.04 Lc** needs more care, particularly if the example conveys essential instructions.
- **New priority:** Dark muted text is approximately **−46 to −48 Lc** on current panels/page, despite passing WCAG text ratios. This warrants review when used for enabled actions, substantive copy, or instructions. Field Hover/Focus currently bind their value to muted text, making this more than a decorative hierarchy question.
- **Buttons:** all 24 variants are specified, but several enabled combinations deserve a readability decision: Secondary/Tertiary Hover **+58.34 Lc**, Pressed **+43.14 Lc**, and Tertiary Dark Default **−42.90 Lc** on its actual specimen background. The 12px/500 Small style requires a separate compact-label decision. These concerns are not evidence that every button or every state is unusable.
- **Boundaries:** leave decorative panel/divider strokes out of the blocker list. Dark Figma fields still warrant contextual review: their 1px border and fill provide little separation from the surrounding panel. Current application fields use the stronger `border/control`, so this is a proposed-adoption risk, not a confirmed current-app border regression.

**Next phase:** treat the complete Button family as one coherent shared implementation, after resolving its few material readability and usage decisions. There is no contrast-based architectural reason to build only Primary Lg first. The family is structurally specified; it is **not ready to ship unchanged across every size/state/theme**. Fields, chips, pill tabs and alerts retain separate specification or readability questions.

## B. Methodology

### Sources and current-state verification

Read live [color variables](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=45-4), [typography](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=51-3), and [Component System WIP](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=102-10517) through read-only Plugin API queries. Re-read all 24 Button variants, field states, chips, pill tabs, alerts, navigation, progress and spinner bindings, including ancestor backgrounds. Inspected [tokens.css](../tools/shared/tokens.css), [navigation.css](../tools/shared/navigation.css), [navigation.mjs](../tools/shared/navigation.mjs), [Builder](../tools/resume-tailor.html), [Tracker styles](../tools/prospect-tracker/styles.css), [UI factories](../tools/prospect-tracker/ui.js), [ingestion UI](../tools/prospect-tracker/ingestion-ui.js), and [Radar placeholder](../tools/career-radar.html).

**Verified synchronization:** all 49 opaque semantic color roles resolve to the same RGB values in Figma and CSS in both modes. The remaining `action/tertiary/bg` is transparent in CSS and zero-opacity in Figma, which is visually equivalent. `surface/default → surface/raised` remains an alias in both themes; raised is White/neutral900, sunken neutral200/neutral950. Focus is synchronized, but component-level usage differs: Builder placeholders use `text/muted`; both apps' fields use `border/control`; current navigation uses neutral page backgrounds and semantic text/link roles, not the lavender Figma header.

### Official evaluator, reproducibility and assumptions

Used **Myndex `apca-w3` 0.1.9**, **SAPC-8 / APCA 0.0.98G, constants 4g**, with `APCAcontrast(sRGBtoY(foreground), sRGBtoY(background))`. The official [APCA documentation hub](https://git.apcacontrast.com/) identifies this implementation; see its [documentation repository](https://github.com/Myndex/SAPC-APCA), [implementation](https://github.com/Myndex/apca-w3), and [versioned package](https://www.npmjs.com/package/apca-w3/v/0.1.9).

Installed the pinned evaluator only in `/private/tmp/nextchapter-apca-evaluation`, because an established implementation was needed to avoid recreating the formula. It brought its declared `colorparsley` 0.1.8 import. Used `--ignore-scripts --no-audit --no-fund`; no runtime dependency, package manifest or lockfile in this repository changed. Temporary JSON snapshots and calculation scripts remain outside the repository.

Reproduction setup, entirely outside the application dependency graph:

```sh
npm install --prefix /private/tmp/nextchapter-apca-evaluation \
  --ignore-scripts --no-audit --no-fund --save-exact apca-w3@0.1.9
```

```js
import { APCAcontrast, sRGBtoY } from 'apca-w3';
// RGB channels are encoded sRGB numbers in the 0–255 range; foreground first.
const Lc = APCAcontrast(sRGBtoY([35, 29, 43]), sRGBtoY([248, 225, 182]));
// +87.130…: action/primary/fg on action/primary/bg, either theme.
```

Nine reference vectors from the package's upstream tests reproduced exactly without installing its test runner. Sanity checks returned black/white **+106.04**, white/black **−107.88**, equal colors **0**. Calculations retain Figma's floating RGB channels; displayed results round to two decimals. `neutral/300` is `rgb(212.1055609 208.48800302 219.91198361)` and `neutral/400` is `rgb(160.02370119 152.14999169 170.85000426)`; tables abbreviate these as **N300/N400**. Other colors are exact displayed hex values.

Positive Lc means darker foreground on lighter background; negative means lighter foreground on darker background. Magnitude is `abs(Lc)`; polarity is never discarded in the results. Zero can mean the implementation's low-contrast clipping, not identical colors or a literal claim of invisibility. Non-text measurements use the named indicator as the foreground; reversing the inputs can change the value.

The component organizing frames and typography reference are explicitly Light. Dark results are **resolved binding projections into the same specified parent contexts**, not evidence of a completed dark-mode visual review. Only combinations present in source, component specimens or their typography reference are evaluated. In particular, the Button set itself has a `background/page` fill: transparent Tertiary Default is measured against that background, not an arbitrarily chosen panel.

### Typography-aware guidance and interpretation

**Guidance:** the [APCA overview](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell) separates fluent body reading, short content, large display and incidental text. The [ARC reference table](https://readtech.org/ARC/tests/visual-readability-contrast/) associates 16px/400 with magnitude 90 and 16px/500 with 75; 12px/400–700 is marked for non-content use. Its simpler content guidance uses 60 for text at least 16px and 45 for large text above 32px. These are different draft evaluation approaches, not interchangeable universal thresholds.

This report uses the reference table as a **conservative typography benchmark**, and the simpler use-case guidance as context. A short action label is not a paragraph, but an essential action is also not incidental text. A brief pressed state can tolerate less reading demand than the default state; that does not automatically justify sustained unreadable hover or default labels. Placeholder/disabled judgments deliberately differ from enabled-content judgments.

**Limitations:** Inter, DM Serif Display and IBM Plex Mono have not been qualified here against the reference fonts' stroke/x-height characteristics. Numeric CSS weight is not proof of perceptual weight equivalence. No exact font-specific minimum is invented. The package's `fontLookupAPCA()` uses an older beta lookup; the web reference table is also draft and has differing entries/use-case rules. Interpolated lookup outputs were used for orientation, not as a certification or a new mandatory size scale. Actual browser font substitution, antialiasing, user zoom, forced colors and reader performance were not tested.

Current apps request some Inter 300 styles while loading 400/500/600; their requested 300 typically matches the available Regular 400. DM Serif Display 600 may be synthesized from Regular. Tables distinguish declared application sizes/weights from the verified Figma specifications. Source-based opacity compositing is an estimate of those states, not a new browser capture.

## C. Text contrast results

### Verified Figma typography

| Styles | Family | Size / line height, px | Weight |
| --- | --- | --- | --- |
| Display; H1; H2; H3; H4 | DM Serif Display | 50/64; 38/48; 28/36; 21/32; 16/24 | Regular 400 |
| Body Large; Default; Small; Caption | Inter | 21/32; 16/24; 12/20; 12/16 | Regular 400 |
| UI Title | Inter | 21.333333969/28 | Semi Bold 600 |
| UI Label; Button; Button Sm; Badge | Inter | 16/24; 16/16; 12/12; 12/20 | Medium 500 |
| Meta | IBM Plex Mono | 12/16 | Regular 400 |

Tracking is zero in every inspected style. These are specifications, not proof that local legacy CSS already consumes them.

### Semantic text in actual surfaces and fields

Each pair of results is **Light / Dark**. Each resolved-color column lists **foreground on background** in the same order. Guidance and action are context judgments under §B, not APCA certification.

| Role / actual use | Foreground → background tokens | Resolved colors: Light; Dark | Signed Lc: L / D | Typography and reading context | Assessment / action |
| --- | --- | --- | --- | --- | --- |
| Primary page copy, shared wordmark, app headings | text/primary → background/page | #231D2B on #FAF9F7; #FAF9F7 on #15111B | +99.78 / −103.32 | Figma Inter 16/400 body and 16/500 labels; apps body 15–16/requested300, headings DM Serif 22–32/requested600 | Strong pair for fluent reading. Retain. Large display needs a typeface-specific visual review, not an automatic high-contrast reduction. |
| Primary panel copy / Figma type specimens | text/primary → surface/default (raised in apps) | #231D2B on #FFFFFF; #FAF9F7 on #231D2B | +103.32 / −101.89 | Inter 16/400, 21/400 body; DM Serif 16–50/400 headings; UI Title 21.333/600 | Strong colors. The 12px body/caption specimens should remain compact ancillary text; high Lc does not make 12px ideal for paragraphs. |
| Secondary page copy / inactive current navigation | text/secondary → background/page | #504759 on #FAF9F7; #EFEBE7 on #15111B | +86.57 / −94.56 | Figma Inter 16/400; current nav inherits 15–16/requested300 | Dark is strong. Light is near the conservative 16/400 benchmark; short navigation is reasonable, sustained small copy merits review. |
| Secondary panel copy / Chip default and hover | text/secondary → surface/default | #504759 on #FFFFFF; #EFEBE7 on #231D2B | +90.12 / −93.13 | Inter 16/400 body; Chip Lg 16/500, Sm 12/500 | Lg has adequate margin; meaningful Sm labels need the compact-label decision. No need to increase decorative Chip borders by default. |
| Tracker status badge | text/secondary → surface/sunken | #504759 on #EFEBE7; #EFEBE7 on #15111B | +78.61 / −94.56 | Current Inter 12/400, short metadata | Reasonable hierarchy for supplementary status; if status is essential to a decision, don't rely on tiny badge text alone. |
| Muted page copy / Builder progress and notes | text/muted → background/page | #68616F on #FAF9F7; N400 on #15111B | +76.23 / −47.75 | Figma upcoming progress 16/500; Builder steps 12/400, notes 13–14/requested300 | Light is reasonable for short labels. Dark low magnitude at small sizes is a meaningful concern for instructions or actionable stages; retain muted only for subordinate content or approve another treatment. |
| Muted panel content / field helper / Builder secondary action | text/muted → surface/default | #68616F on #FFFFFF; N400 on #231D2B | +79.78 / −46.32 | Figma helper Inter 12/400; Builder secondary 14/400, preview blurb 14/requested300 | Dark essential content needs review even though WCAG ratio is 5.91. In either theme, helper instructions are not automatically incidental just because styled small. |
| Figma Placeholder, all three field families | text/placeholder → input/bg | #837A90 on #FAF9F7; #837A90 on #15111B | +64.42 / −33.04 | Inter Body Default 16/400; redundant short example, persistent label above | Light acceptable under an internal spot-text interpretation. Dark needs designer review for comfortable recognition. Essential formats/instructions should be separate readable helper text. Keep WCAG note (§F). |
| Figma Filled value | text/primary → input/bg | #231D2B on #FAF9F7; #FAF9F7 on #15111B | +99.78 / −103.32 | Inter 16/400; actual entered content | Strong. Preserve full job descriptions and normal native editing. |
| Figma Hover value | text/muted → input/hover | #68616F on #EFEBE7; N400 on #352D40 | +68.27 / −43.15 | Inter 16/400; value sample, not placeholder token | Below conservative content guidance, especially Dark. Clarify whether the sample is placeholder-only; if entered content also becomes muted, this is a readability regression to resolve before adoption. |
| Figma Focus value | text/muted → input/bg | #68616F on #FAF9F7; N400 on #15111B | +76.23 / −47.75 | Inter 16/400; active editing | Stronger than Hover but still weak Dark for reading/editing. Resolve the value-color contract; do not apply placeholder exemptions to entered content. |
| Builder actual placeholder | text/muted → background/page | #68616F on #FAF9F7; N400 on #15111B | +76.23 / −47.75 | Inter 15/requested300, generally matched400; includes revision prompt | Different from Figma. Light has more margin; Dark can remain subordinate only with adequate separate instructions/labeling. Browser placeholder opacity remains unverified. |
| Disabled Figma value | action/disabled/fg → input/bg | #837A90 on #FAF9F7; N400 on #15111B | +64.42 / −47.75 | Inter 16/400; disabled label/helper also use disabled fg on panel | Reasonable de-emphasis, not enabled reading. If unavailable content must be read, use read-only rather than assuming disabled treatment is sufficient. |

**IBM Plex Mono:** the live typography reference uses Meta 12/400 in actual ancillary specimens. `text/muted` on page is **+76.23 / −47.75**; on the type-table surface **+79.78 / −46.32**. Primary Meta on that table is **+103.32 / −101.89**. Folder labels explicitly use `secondary/700` on fixed `neutral/100`, **+87.43**. The dark editorial masthead uses fixed primitive backgrounds, not Dark semantic mode: `primary/200` on `neutral/900` is **−88.02**; N300 on neutral900 **−77.27**. These are compact design-reference annotations, not an existing app monospace metadata implementation. Keep incidental annotation use distinct from future essential dates, identifiers or long code-like content; font qualification would be necessary to assert an exact minimum.

### Interactive text and feedback outside Button specimens

| Role / component | Foreground → background | Resolved colors: Light; Dark | Signed Lc: L / D | Actual typography / guidance context | Assessment / action |
| --- | --- | --- | --- | --- | --- |
| Current active nav / page links | link/default → background/page | #523394 on #FAF9F7; #D7CDFB on #15111B | +87.43 / −79.20 | Inter 15–16/requested300, short links | Good short-label distinction. Body-sized Dark links have less margin than primary copy; retain separate interaction cues. |
| Links in panels | link/default → surface/default | #523394 on #FFFFFF; #D7CDFB on #231D2B | +90.97 / −77.77 | Inter 15–16/requested300; Tracker company link 15/500 | Reasonable for short links. Avoid using link color for long reading text. |
| Builder selected emphasis chip / hovered links | link/default → selection/bg | #523394 on #EEE9FD; #D7CDFB on #35245B | +79.47 / −74.90 | Chip Inter 13/400; hovered links 15–16/requested300 | Short selected labels are plausible, but compact essential labels deserve review. Existing chip keyboard/selection semantics remain separate issues. |
| Figma MainNavItem Default/Hover on lavender Header | action/secondary/fg → action/secondary/bg | #231D2B on #D7CDFB in both modes | +77.67 / +77.67 | Inter UI Button 16/500; wordmark DM Serif H2 28/400 | Adequate intended context. No actual neutral900-on-neutral900 defect here. Keep the header context attached to the nav specification. |
| Figma MainNavItem Selected | action/primary/fg → action/primary/bg | #231D2B on #F8E1B6 in both modes | +87.13 / +87.13 | Inter 16/500 | Clear text. Selected/nonselected distinction also needs non-color semantics. |
| Figma MainNavItem Disabled on Header | action/disabled/fg → action/secondary/bg | #837A90 on #D7CDFB; N400 on #D7CDFB | +42.31 / +27.79 | Inter 16/500; unavailable destination | Dark-mode binding on a lavender header is especially faint. Review recognizability, not enabled-action compliance. No disabled destination exists in current shared nav. |
| Tracker normal feedback | text/primary → selection/bg | #231D2B on #EEE9FD; #FAF9F7 on #35245B | +91.82 / −99.01 | Inter 15/requested300; prose/status | Strong source pair; longer content still benefits from readable size. |
| Tracker error feedback | danger/fg → selection/bg | #9B1F43 on #EEE9FD; #F79BB3 on #35245B | +74.38 / −57.88 | Inter 15/requested300; errors and recovery instructions | Actual backdrop differs from Alert. Dark essential messages require review; WCAG pass alone does not establish fluent readability. |
| Builder revision note | warning/fg → warning/bg | #9A3412 on #FFF7ED; #FDBA74 on #231D2B | +80.26 / −70.94 | Inter 14/requested300; explanatory message | Light plausible; Dark/small long copy merits review. This is not the 12px Figma badge specimen. |
| Figma Alert Success | success/fg → success/bg | #195E3D on #EFFAF3; #87CFA5 on #231D2B | +81.95 / −66.46 | Inter Badge 12/500, line20 | Short status can be ancillary; don't use unchanged for essential long instructions. |
| Figma Alert Danger | danger/fg → danger/bg | #9B1F43 on #FFF1F4; #F79BB3 on #231D2B | +79.49 / −60.76 | Inter Badge 12/500, line20 | Review essential error-message size/readability. |
| Figma Alert Warning | warning/fg → warning/bg | #9A3412 on #FFF7ED; #FDBA74 on #231D2B | +80.26 / −70.94 | Inter Badge 12/500, line20 | Same compact-message decision; no automatic severity-color replacement. |
| Figma Alert Info | info/fg → info/bg | #15111B on #EEE9FD; #B3A5F5 on #231D2B | +93.67 / −57.21 | Inter Badge 12/500, line20 | Dark primary instructions deserve stronger treatment or larger type; fluid layout also unresolved. |

Navigation on a dark neutral panel using `action/secondary/fg` would be misuse, not a combination observed in the intended Figma Header or current code. It is excluded from the defect measurements.

### Complete Button matrix

**Verified:** Button `53:220` contains 3 variants × 2 sizes × 4 states. **Lg:** Inter Medium 500, 16px/16px, 40px height; **Sm:** Inter Medium 500, 12px/12px, 28px height. Lg padding 16px horizontally/gap8; Sm padding12/gap6. One-pixel inside strokes exist on enabled variants; disabled variants remove the stroke. Foreground/fill pair is identical between sizes, so each row covers **both actual size variants**, with separate assessments.

**Guidance context:** Lg 16/500 is compared to the conservative reference magnitude 75, alongside simpler short-content magnitude 60. Sm 12/500 has no fluent-content endorsement in the cited reference table; it is not assigned an invented exact minimum. Existing approval of a style is evidence of intent, not a perceptual test result.

| Variant / state, Lg and Sm | Actual foreground → background binding | Resolved foreground / background: L; D | Signed Lc: L / D | Lg assessment / action | Sm assessment / action |
| --- | --- | --- | --- | --- | --- |
| Primary Default | action/primary/fg → action/primary/bg | #231D2B / #F8E1B6 both | +87.13 / +87.13 | Strong short enabled label; proceed. | Good color difference; still review 12px essential-label policy. |
| Primary Hover | action/primary/fg → action/primary/hover | #231D2B / #F1CC88 both | +76.57 / +76.57 | Supports reference benchmark; proceed. | Less margin than Default; compact-label review. |
| Primary Pressed | action/primary/fg → action/primary/pressed | #231D2B / #E5AE54 both | +62.68 / +62.68 | Below conservative table, above simple short-content guidance. Brief pressed use is a reasonable internal acceptance candidate; approve explicitly. | Smaller essential label warrants review; do not declare pass from the Lg use case. |
| Primary Disabled | action/disabled/fg → action/disabled/bg | #837A90 / #EFEBE7; N400 / #352D40 | +56.46 / −43.15 | Deliberately subordinate, distinguishable text; no enabled reading target. Review context if unavailable control must be located easily. | Recognizability review at 12px; no universal disabled-text failure. |
| Secondary Default | action/secondary/fg → action/secondary/bg | #231D2B / #D7CDFB both | +77.67 / +77.67 | Supports reference benchmark; proceed. | Compact-label review. |
| Secondary Hover | action/secondary/fg → action/secondary/hover | #231D2B / #B3A5F5 both | +58.34 / +58.34 | Slightly below simple short-content guidance and well below reference table. Sustained pointer hover warrants designer review. | Stronger review needed for small enabled text. |
| Secondary Pressed | action/secondary/fg → action/secondary/pressed | #231D2B / #9782EB both | +43.14 / +43.14 | Meaningful readability concern. Brief duration mitigates reading demand, but needs a deliberate color/type decision before shipping unchanged. | Highest-priority enabled compact state to resolve. |
| Secondary Disabled | action/disabled/fg → action/disabled/bg | #837A90 / #EFEBE7; N400 / #352D40 | +56.46 / −43.15 | Same disabled interpretation as Primary. | Same compact disabled review. |
| Tertiary Default, transparent over Button set | action/tertiary/fg → background/page | #523394 / #FAF9F7; #9782EB / #15111B | +87.43 / −42.90 | Light strong; Dark enabled default needs readability review, independently of its subtle border. | Dark concern compounded by 12px size; resolve before essential-action use. |
| Tertiary Hover | action/secondary/fg → action/secondary/hover | #231D2B / #B3A5F5 both | +58.34 / +58.34 | Same concern as Secondary Hover. Role change is specified, not missing. | Same compact review. |
| Tertiary Pressed | action/secondary/fg → action/secondary/pressed | #231D2B / #9782EB both | +43.14 / +43.14 | Same concern as Secondary Pressed. | Same compact review. |
| Tertiary Disabled | action/disabled/fg → action/disabled/bg | #837A90 / #EFEBE7; N400 / #352D40 | +56.46 / −43.15 | Same disabled interpretation; no transparent disabled variant. | Same compact disabled review. |

The matrix covers all 24 Figma variants and **48 theme resolutions**. Positive values for filled buttons in Dark are intentional: their foreground remains dark on a light fill. Do not force a negative sign merely because the application theme is Dark.

**Current implementation is different.** Builder's Primary/Revision buttons use 14px/500, no Figma pressed fill, Hover whole-control opacity .88 and Disabled .35. Compositing foreground and fill over their raised card gives Hover **+81.83 Light / +73.76 Dark**, Disabled **+36.43 / +21.68**. Hover resolved pairs are `rgb(61.400 56.120 68.440)` on `rgb(248.840 228.600 190.760)` in Light, and `#231D2B` on `rgb(222.440 201.480 165.320)` in Dark. Disabled pairs are `rgb(178.000 175.900 180.800)` on `rgb(252.550 244.500 229.450)`, and `#231D2B` on `rgb(109.550 97.600 91.650)`. Disabled Dark is quite faint; review whether its label still explains an unavailable action. It is not an enabled WCAG text failure. These composites assume the actual card background and source opacity, not all possible placements.

Tracker Primary uses 15px/500 and the Primary Default pair; its buttons inherit .5 disabled opacity rather than Figma disabled roles. Current `.secondary` is transparent with semantic muted text (Builder tertiary, Tracker secondary), not the filled Figma Secondary. This usage mismatch needs explicit migration mapping. No existing action semantics, generation, handoff or export behavior should be changed to solve it.

## D. Non-text contrast assessment

APCA values below are **supporting perceptual evidence**, not text-threshold tests for 1–2px strokes, icons or hit boundaries. The documentation hub still marks dedicated non-text guidance as incomplete. The classifications and recommendations are professional design interpretations; the separate WCAG applicability notes are in §F.

| Actual usage / category | Pair, colors and signed Lc Light / Dark | Contextual assessment |
| --- | --- | --- |
| Shared focus indicator — essential | focus/ring on page/input: #523394 on #FAF9F7 **+87.43**; #B3A5F5 on #15111B **−58.64**. On panel: #523394 on #FFFFFF **+90.97**; #B3A5F5 on #231D2B **−57.21** | Updated colors supply clear separation. Shared code outlines are 2px with 2px offset. Figma field wrapper is 2px OUTSIDE, no gap; that unresolved geometry is independent of color. Builder fields still use a 1px accent border with outline suppressed; generic Builder buttons do not yet have explicit shared focus styling. No blanket focus-compliance certification follows from token values. |
| Figma input boundary — potentially essential | Light #837A90 on input #FAF9F7 **+64.42**, hover #EFEBE7 **+56.46**, panel #FFFFFF **+67.97**. Dark #504759 on input #15111B **−11.51**, hover #352D40 **0**, panel #231D2B **−10.08** | 280×40 inputs/selects and 280×96 textarea interiors provide useful size, placement, label and content cues. However, empty-field extent still depends substantially on its 1px edge: Dark fill vs panel also clips to **0**; hover fill vs panel **0**. Labels locate a field but do not reliably describe its editable extent. Review actual dark forms and low-vision recognition before adopting. Strong focus cannot substitute for recognition before focus. No recommendation to strengthen solely because of a ratio. |
| Current app input/card-link boundary — essential/supporting | border/control: Light #837A90 on page/input **+64.42**, panel **+67.97**; Dark N400 on page/input **−47.75**, panel **−46.32** | Current controls and prospect link cards retain materially stronger edges than Figma dark input/border. Preserve this distinction until the field treatment is approved. |
| Card/panel/column outlines and header/divider rules — supporting/decorative | border/subtle: Light N300 on page **+20.28**, panel **+23.83**; Dark #504759 on page **−11.51**, panel **−10.08** | Whitespace, headings, padding, background and layout also group content. A faint container edge is not itself a failed control. Header rule and noninteractive panel edges need no blanket strengthening. Prospect cards use control border, not subtle. |
| Tertiary/Chip default outlines — supporting, possibly essential in ambiguous placements | Same subtle-role separation on their actual page/panel contexts | A clear action label, pill geometry, grouping and focus can identify the control without a high-contrast hit-area outline. Current enabled text concerns are separate. If a particular control is recognizable only through the edge, evaluate that placement; don't certify all boundaries or reject all decorative strokes. |
| Primary Button boundary — supporting to visible label/fill | #504759 on Default #F8E1B6 **+73.93**, Hover #F1CC88 **+63.37**, Pressed #E5AE54 **+49.48**, both modes | One-pixel border adds definition. Enabled label/fill already identifies an action; no new border blocker. |
| Secondary/Tertiary filled-state boundary — supporting | #523394 on Default #D7CDFB **+65.32**, Hover #B3A5F5 **+45.99**, Pressed #9782EB **+30.79**, both modes | The 2.97:1 pressed stroke/fill ratio is not automatically a hit-area failure where the text/fill identify it. Foreground readability remains the material issue. |
| Disabled Button fill — supporting/unavailable | Disabled fill vs Actions panel: #EFEBE7 on #FFFFFF **+9.01**; #352D40 on #231D2B **0** | No border; label and action-group position do much of the recognition work. Dark Small especially needs a visual check, but disabled controls are not evaluated as enabled targets. |
| Chip selected indicator — essential state; default boundary supporting | Selected uses Primary fill/foreground: text/icon **+87.13** in both modes, primary border **+73.93** on fill | Colors plausibly reinforce selection. Current Builder selection uses lavender roles instead. Exposed pressed/selected semantics and keyboard access are still necessary. |
| Pill tab selection — essential state | Lavender #D7CDFB on panel #FFFFFF **+23.36**; on #231D2B **−77.77** | Hover and Selected are identical in the live component. Contrast does not resolve that ambiguity. Light selection fill is modest; assess a persistent non-color state cue and 22px target/group mechanics before implementation. |
| Button icons — supporting/decorative when redundant | Verified optional icons inherit button foreground; therefore the relevant Lc is exactly the Button matrix value (e.g. Primary Default **+87.13**, Tertiary Dark Default **−42.90**) | Lg glyphs occupy roughly 15×13 within 16px slots; smaller icons have less detail margin. Redundant icons need no independent text-style test. An icon-only action would need its own recognition/name contract and is not specified by these variants. |
| Select arrow — supporting interactive affordance | text/secondary on input/bg: #504759 on #FAF9F7 **+86.57**; #EFEBE7 on #15111B **−94.56** | Verified visible 10.5×6 glyph helps distinguish a closed select. Keep native select behavior; no custom popup implied. |
| Shared theme switch — essential operation; redundant imagery | Thumb link/default on sunken track: #523394 on #EFEBE7 **+79.46**; #D7CDFB on #15111B **−79.20** | Current 52×28 switch has 20px thumb, native accessible button name/pressed state and focus outline. Its sun/moon imagery is aria-hidden and redundant. Figma 48×28 switch is a separate specimen, not the code implementation. |
| Step Progress / spinner — supporting orientation; meaningful status requires text | Active/completed badge icon Primary fg/bg **+87.13**; upcoming disabled fg/bg **+56.46 / −43.15**. Spinner loading/fg vs loading/bg: #523394 on #EFEBE7 **+79.46**; #F8E1B6 on #504759 **−76.79** | Badge/check/number and stage label reinforce progress. Active and Completed use the same badge colors; different symbols matter. Spinner is 28px, track2px; Lc is not an animation/reduced-motion test. Current 12px progress labels and Dark muted stages are the text concern. |
| Alert icons/borders — supporting severity beside explicit message | Foreground/icon on severity fill shares §C: Success **+81.95 / −66.46**, Danger **+79.49 / −60.76**, Warning **+80.26 / −70.94**, Info **+93.67 / −57.21** | Verified 16px slots, e.g. Success 14×14 glyph; outline1px uses severity border. Clear message/semantic announcement must carry meaning too. Small essential message type, not ornamental outline contrast, limits readiness. |

## E. Previous findings revisited

| Previous concern | Updated classification | Evidence and implication |
| --- | --- | --- |
| Light focus ring | **Resolved by updated tokens** | Figma/CSS Light secondary700; +87.43 on page, +90.97 on panel. Current token is not the previous secondary400. Field gap and coverage remain implementation/specification questions, not that old color failure. |
| Light placeholder | **Acceptable under APCA-informed design policy**, conditional | +64.42 at Inter16/400 is plausible for redundant placeholder examples with labels. This does not clear the 3.87 WCAG concern or permit essential instructions to become placeholder-only. |
| Dark placeholder | **Requires designer review** | −33.04 at 16/400 is much weaker than Light. It is incidental, not fluent copy, but comfortable recognition is not established. |
| Dark input borders | **Context-dependent** | Low border/fill separation corroborates a possible empty-field recognition issue; dimensions, alignment, labels and select arrow help. Current app control borders are stronger. Review actual empty forms before choosing whether/where an edge needs strengthening. |
| Subtle borders | **Acceptable under APCA-informed design policy** for decorative/supporting uses; **Context-dependent** for essential ones | Panels/dividers are not controls; Tertiary/Chip edges can be supporting if their labels identify them. No blanket border blocker survives. |
| Navigation on dark neutral surface | **Context-dependent misuse**, not an actual defect | Intended Header is lavender in both modes; nav 16/500 measures +77.67. Code uses semantic text/link roles on page. Keep the hypothetical reuse warning separate. Disabled Header nav still merits review. |
| Primary Button family | **Requires designer review** for Small/Pressed policy; default/hover Lg acceptable | +87.13/+76.57 default/hover, +62.68 pressed. Brief Lg pressed use is a plausible internal acceptance; Small cannot inherit that conclusion automatically. Old focus blocker resolved. |
| Secondary/Tertiary family | **Confirmed concern** in enabled low-magnitude states; **Requires designer review** of remedy | Hover +58.34, Pressed +43.14; Tertiary Dark Default −42.90. All pass the relevant WCAG text color ratios, yet modest magnitude at 16/500 or12/500 warrants a real readability decision. |
| Disabled buttons | **Context-dependent** | Figma text +56.46/−43.15 is subordinate rather than enabled-content failure. Borderless dark fill and current Builder −21.68 disabled composite need recognizability review. |
| Alerts previously described as passing | **Requires designer review** for actual message role | All severity ratios still pass. APCA highlights modest Dark contrast and 12/500 essential-copy risk; a 114px-wide short status specimen does not specify a long error message. |
| Dark muted/helper/action text | **Confirmed concern** for substantive/interactive use | −43 to −48 in several actual contexts. Not every metadata label is a blocker, but extended copy and enabled action labels should not be accepted from WCAG ratio alone. |

## F. WCAG 2.2 compatibility notes

APCA is the preferred **internal perceptual evaluation**, not a replacement for published accessibility obligations. [WCAG 3.0 remains a Working Draft](https://www.w3.org/TR/wcag-3.0/); no WCAG 3, ARC tier, legal compliance or full WCAG 2.2 conformance claim is made here.

The [W3C text criterion](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) includes placeholder and hover/focus text. The [non-text criterion](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) applies to necessary identifying information, not every visible edge; a labeled control need not always have a contrasting hit-area boundary. Disabled controls have exceptions. This distinction supports retaining the previous findings while narrowing their applicability.

| Finding | Current WCAG 2.2 implication, separately from APCA |
| --- | --- |
| Updated focus color | Light page 8.83:1/panel 9.29:1, Dark page 8.53:1/panel 7.50:1: these adjacent-surface pairs clear 3:1. Token color alone does not test focus visibility, clipping, obscuration, indicator geometry or all placements. |
| Figma Light placeholder | 3.87:1 at 16/400 is below 4.5:1. Internal spot-text acceptance does not remove this concern. Dark 4.57:1 clears the ratio despite lower APCA magnitude. Builder's different source pair is 5.66:1 Light/6.72:1 Dark before any browser opacity. |
| Dark Figma input boundary | Border vs panel 1.86:1; fill vs panel 1.14:1. If these supply essential recognition, conformance remains a concern. Whether the control is otherwise identifiable is contextual; a label alone is not a blanket exemption for indistinguishable editable regions. Current app control border vs panel 5.91:1. |
| Subtle containers / Tertiary edges | Decorative outlines do not independently fail 1.4.11. An outline that is essential in a specific placement must be evaluated there. |
| Enabled Button foregrounds | Primary Default 12.82, Hover 10.71, Pressed 8.20; Secondary/Tertiary filled states 10.93/7.50/5.23. Tertiary Default page 8.83 Light/5.95 Dark. These color pairs clear 4.5:1, including small text; APCA concerns remain independent. |
| Button pressed border | Secondary stroke vs fill2.97:1 is not automatically failure when visible label/fill identifies the action. Do not round this up to3:1 or use it alone to block all buttons. |
| Alerts and current feedback | Figma severity fg/bg ratios clear 4.5 in both modes. Current Tracker error on its actual selection backdrop6.63 Light/6.62 Dark also clears the ratio. APCA/type-role concerns are not suppressed. |
| Small tabs and semantic defects | Pill tab 22px height requires actual target/spacing assessment. Original Builder mouse-only chips/tabs, label associations, live feedback and required/error associations remain separate accessibility findings; this contrast report does not resolve them. |

This is an assessment of inspected pairs and source patterns, not a complete conformance audit. Existing exports/document formatting were not evaluated or changed.

## G. Updated component readiness

**Categories:** usability/readability risks, unresolved specifications, WCAG concerns and nonblocking visual refinements are distinct. Ready to construct a shared CSS contract does not mean ready to release every specimen unchanged; WIP existence is not design approval.

| Family | Contrast/readability | Material specification or behavior gaps | Updated readiness |
| --- | --- | --- | --- |
| Primary Button Lg | Default/Hover strong; brief Pressed reasonable acceptance candidate. Focus token resolved. | Narrow-label behavior, shared focus coverage and existing loading/disabled handling must be retained/defined. | **Can proceed within the complete Button phase**, with explicit pressed acceptance. No decorative-border blocker. |
| Primary Button Sm | Strong default pair;12px/500 meaningful-action use not endorsed as fluent reference content. | Approve compact-label usage/typography. | **Designer decision before unchanged release**; not a reason to invent a separate architecture. |
| Secondary Button | Lg Default strong; Hover/Pressed concern, Sm amplifies it. | Map existing transparent secondary actions to the intended filled/tertiary role. | **Can be built in the same phase after the state/type decision**; don't ship unchanged low-magnitude states by assumption. |
| Tertiary Button | Light Default strong; Dark Default and filled Hover/Pressed concern. Subtle border alone is nonblocking. | Same action mapping, focus/label behavior, approved placement context. | **Same coherent Button phase**, conditional on resolving enabled readability. |
| TextField | Filled strong; Light incidental placeholder acceptable internally with WCAG concern. Dark empty boundary and muted Hover/Focus values unresolved. | Value vs placeholder state contract, focus gap, invalid/helper treatment, label association. | **Do not wholesale migrate unchanged yet.** Keep current stronger code edges meanwhile. |
| TextArea | Same field issues, heightened importance of fluent entered job descriptions. | Min-height/resize/overflow and long-copy handling. | **Separate native-field phase after decisions**; never dim/truncate entered descriptions to fit a sample. |
| Native Select | Label/value/arrow can identify control; dark boundary still contextual. | Same value/error/focus decisions; preserve browser popup. | **Native implementation remains appropriate**, but shared visual adoption waits on field decisions. No custom-search/menu requirement. |
| Chip | Lg foreground pairs plausible; Sm meaningful-label decision. Default border supporting. | Toggle/multi-select intent, focus/disabled, sizing; replace mouse-only spans through a separately scoped task. | **No blanket contrast blocker for Lg**, but semantics and compact usage must be settled before migration. |
| Pill tabs | Primary/selected text colors strong, but 12px/500 and identical Hover/Selected treatment unresolved. | Persistent selected cue, keyboard/group/panel relationship,22px targets. | **Not ready unchanged**; state ambiguity is a real usability issue, not a decorative-border failure. |
| Alert | Severity colors plausibly support short statuses; Dark low magnitude and 12px/500 cannot automatically serve essential long messages. | Message typography, fluid width/wrapping; announcement urgency stays local. | **Ready for design refinement, not blanket adoption of 114px specimen**. No ornamental-border blocker. |

The whole Button family is sufficiently specified for **one implementation contract**: native button base, 3 variants, 2 sizes, native `:hover`/`:active`/`:disabled`, optional existing icons, and token-based focus. Remaining contrast decisions affect design acceptance, not the feasibility of that contract. Genuine enabled-label concerns should be resolved before release; metadata and decorative strokes should not be used to postpone unrelated Button work.

## H. Recommended next implementation task

**One narrowly scoped complete Button-family phase**, not Primary-only followed by repeated architecture changes. Its starting design review should settle §I's Button decisions using the actual 48 mode/state/size resolutions and representative action labels. Then introduce a small opt-in shared native-button stylesheet and explicitly map existing actions in Builder/Tracker. No framework or general JavaScript component factory is needed.

Include Primary/Secondary/Tertiary × Lg/Sm × Default/Hover/Pressed/Disabled; use the now-synchronized focus token and documented local-surface gap. Keep disabled/loading behavior, native keyboard activation, action handlers and optional icon naming local. Exclude fields, alerts, tabs, header redesign, generation, exports, Supabase writes and job-handoff logic changes from this phase.

Acceptance should check all variants/themes, keyboard focus, long labels and narrow layouts; disabled recognizability; save/send/cancel and generation/download controls; and preservation of existing busy/state behavior. If Small or a state needs a revised approved treatment, settle it inside this coherent family before release rather than silently substituting an unreviewed color/type value. If design approval is withheld for a subset, defer that subset explicitly; do not label the unchanged full matrix perceptually approved.

## I. Design decisions still needed

1. **Button readability:** approve the short-label policy for 12px/500 Small; decide the intended treatment/acceptance of Primary Pressed, Secondary/Tertiary Hover/Pressed and Tertiary Dark Default. Review actual Inter rendering and action text, not only swatches. No arbitrary universal Lc target is proposed.
2. **Button usage/layout:** map current transparent `.secondary` actions to filled Secondary or Tertiary; define long-label wrapping/minimum width and confirm shared focus coverage with the existing 2px/2px convention. Disabled labels that explain unavailable actions must remain recognizable.
3. **Native fields:** decide whether Hover/Focus muted values are only placeholder examples or also entered content. Resolve the outer-ring gap, invalid/helper presentation and dark empty-field recognition before adopting weaker edges. Preserve readable full descriptions and native textarea/select behavior.
4. **Placeholder policy:** confirm redundant-example use vs essential format instructions, and whether resolving the remaining WCAG Light placeholder concern is required for release. Dark recognition deserves a visual check even where WCAG passes.
5. **Compact content/state:** determine which muted 12–14px labels are truly ancillary, which alerts contain essential recovery instructions, and the needed fluid Alert layout. For tabs, approve a persistent selection cue and compact target treatment; for chips, confirm toggle semantics and Small use. These are separate from the Button architecture.

### Validation and limits

Verified live token aliases, all Button bindings and actual parent backgrounds; compared 49 opaque roles across both themes to CSS with no resolved-color drift; confirmed transparent equivalence; reproduced 9 upstream APCA vectors plus polarity/equality sanity checks; calculated the documented text/non-text pairs and Builder opacity composites. Reviewed source usage/relative report links and ran `git diff --check`. The original audit and tracked code/configuration remained unchanged.

No runtime dependency files, Figma data, app styles or behavior were modified. No hosted prospect records were read or written. No application tests or new browser/user readability study were run for this documentation-only evaluation. Dark projections, typeface qualification, platform rendering, visual recognition, zoom/reflow and complete WCAG conformance remain validation limits; they are not presented as verified passes.
