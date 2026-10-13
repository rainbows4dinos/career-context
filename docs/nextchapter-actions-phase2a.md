# nextchapter Actions — Phase 2A

October 11, 2026. Implementation source: [Figma Actions](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-5336). The earlier [component audit](component-system-audit.md) and [APCA evaluation](apca-contrast-reevaluation.md) describe their inspected baselines; current Figma bindings include subsequent color updates.

## Shared contract

`tools/shared/components.css` is opt-in and loaded after local styles in Builder and Tracker. It contains no global button or theme selectors. Application positioning and state remain local.

- Buttons: `.nc-button`, one of `--primary`, `--secondary`, `--tertiary`, and one of `--lg`, `--sm`. Large is 40px minimum height, Inter 16/500; Small is 28px, Inter 12/500. Native hover, active, disabled and keyboard focus use semantic tokens. Wrapped labels can increase height. Optional `.gravity-icon` children occupy 16px/12px slots; labels remain required.
- Chips: `.nc-chip` with `--lg` or `--sm`; selection uses `aria-pressed` and `.nc-chip--selected`. Canonical parsing, selected values and ordering remain in Builder.
- Pill tabs: `.nc-pill-tabs` and `.nc-pill-tab`. Builder owns panel relationships, roving focus and automatic activation on focus, following the [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Left/Right wrap, Home/End navigate, and native Enter/Space activate. Selected tabs use the lavender fill and `aria-selected`; labels have no underline.
- Step Progress Item: `.nc-step`, `--active`, `--upcoming`, `--completed`, `__badge`, `__label`. Default and active badges use actual 16/24 Medium number labels; completed badges use the Gravity `check` icon at 20px inside 32px circles. Step labels use Button Sm 12/12 Medium typography. Builder retains `setStep()` and communicates current/completed state through `aria-current` and accessible text.

- Step Progress Indicator: `.nc-step-progress` and `__stage` compose the three existing Items, matching [Figma 102:11781](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=102-11781). Horizontal connectors use `border/control`, 1px strokes and 16px gaps; Indicator labels use `text/primary` in all stages. The outer Indicator has no vertical padding. It fills the existing Builder width and uses the Sm/Horizontal variant at 600px and below: only the active step label is visible; other labels remain available to assistive technology. The vertical variant is not implemented. Step IDs, accessible state and workflow orchestration are preserved.

All colors reference existing `--nc-*` roles. Pressed colors and Small typography retain the approved specification. Focus uses the shared 2px ring and 2px offset. Export formatting is independent.

## Adoption

Builder's Generate, retry/Start Over, Download Package and Request Revision use Primary Large. Start New Application uses Tertiary Large. Focus chips use Small. The two document tabs and three progress stages use the shared styles.

Tracker's Sign in, Add prospect/Save details and Change status use Primary Large. Sign out, Refresh, Try again and Send to Résumé Builder use Tertiary Large. Filled Secondary and Small buttons are available without assigning them to an ambiguous existing action.

Theme controls, navigation links, board disclosure, specialized ingestion controls and the stale-record recovery action retain their local appearance. Career Radar remains a placeholder. No database schema, data layer, generation, export or handoff implementation changed. The synthetic fixture additionally serves the existing Gravity sprite/names assets for local verification.

## Validation

- `npm run typecheck` and `npm run lint` pass in `tools/career-radar`.
- `npm test`: 86 pass. Fixture-based tests require permission to bind localhost in a restricted execution environment.
- Isolated Chrome with the synthetic local fixture: all 48 button size/state/theme combinations, disabled hover/active isolation, focus, keyboard chips, ordered multiselect/reset, tab arrows/Home/End/wrapping and progress transitions pass.
- Builder synthetic responses: generation, failure/retry, selected-focus prompt, cover-letter revision and busy states pass. Existing export libraries produce both PDFs, three DOCX files and the download package; package busy state and original label recover.
- Tracker synthetic records: authentication/logout, create/edit/save, status transitions, board/Done, Applied expand/collapse, ingestion preview/save and explicit duplicate handling pass. Duplicate preview adds no prospect; separate save adds exactly one.
- Real handoff action: Pages-relative URLs, complete long descriptions, repeated transfers, existing draft confirmation, unrelated content preservation, expired/malformed/missing payloads, blocked storage/popups and standalone navigation pass. Sending adds no prospect or history event.
- Builder wraps long labels at 320px and 390px. Tracker detail retains a pre-existing 2px overflow at 320px, also present with the new stylesheet disabled. Both themes were inspected; no hosted prospect records were accessed.
- Step Progress Indicator: all three stages in both themes at 320/390/600/601/1280px pass, including connectors, 32px badges/20px icons, labels, accessible current/completed state, pane transitions and reset. Synthetic generation/failure/retry and revision remain operational.
- `git diff --check` passes. Native browser behavior was checked; this is not a full screen-reader or WCAG conformance audit.

## Remaining design concerns

Chip Hover's label concern is resolved by the corrected Figma binding: both Small and Large use `action/primary/fg` (`#231D2B`) on `action/primary/bg` (`#F8E1B6`) in both themes. Default labels retain `text/secondary`; Selected styling is unchanged. Browser checks cover both sizes/themes, hover exit, selected hover, focus and native keyboard selection. No semantic tokens changed for this correction.

Secondary/Tertiary Hover retains the specified colors (approximately +58.34 Lc in the prior APCA evaluation). The approved transient pressed treatments remain unchanged. Existing field/helper, compact target and other accessibility concerns from the audits are outside this Actions implementation; no blanket conformance claim is made.
