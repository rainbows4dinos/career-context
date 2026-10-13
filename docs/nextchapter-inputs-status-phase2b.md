# nextchapter Inputs & Status — Phase 2B

October 12, 2026. Implementation of the current Figma definitions, inspected through component design context, screenshots and read-only Plugin API queries. No Figma edits, token changes, runtime dependencies or database changes.

## Design contract

Sources: [Inputs](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-5347), [Status](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-5351), [Toast](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=125-11817).

- **Input Label:** native, explicitly associated labels; Inter 16/24, weight 500, primary text, required marker and optional descriptions. Disabled controls also dim their label, description and helper.
- **TextField / TextArea / Select:** native elements with 1px `border/control`, 8px radius, 12px horizontal padding and Body Default 16/24 Regular typography. Labels, fields and helper/error text have 4px vertical spacing. Input/select height is 40px; textarea default minimum is 96px with vertical resize. Builder retains its 140px job description, 72px notes and 80px revision minimums; Tracker retains its 120px editor textareas.
- **States:** input backgrounds follow `input/bg` and `input/hover`; placeholders use `text/placeholder`, disabled content uses `action/disabled/fg`. Entered values remain `text/primary` in every enabled state, deliberately overriding the muted Hover/Focus specimen values. Existing 2px focus ring and 2px offset are preserved. Error borders use `danger/fg` without increasing their thickness.
- **Select:** existing options and values remain native. An empty-value option receives placeholder styling. The Gravity chevron cannot intercept pointer events; forced colors restores the native arrow.
- **Alert:** four severity variants with their existing foreground/background/border tokens, Gravity icons, 8px padding, 4px gap, 12px margins above/below and Badge 12/20 Medium text. Flexible width, wrapping and content-driven height; no height limits. Urgent failures announce as alerts; routine messages use polite status; static messages can opt out of announcements. No automatic dismissal or focus movement. The Builder’s Prospect Tracker handoff notice opts into an accessible dismiss button; required error alerts remain persistent.
- **Toast:** four variants. Unlike Alert, all use `surface/raised`, primary label text, a 1px control border and the verified 1px/1px/0 control-colored shadow; severity colors apply to the leading icon. Padding/gap/type match the current specimen. The optional xmark close button defaults on, has a 24px target, accessible name and shared focus treatment. Its presence is independent of duration.
- **Spinner:** 28px, 2px loading-token ring, CSS rotation. Reduced motion stops rotation. The ring is hidden from assistive technology; its surrounding application status conveys loading. Failed/completed operations stop their spinner.

## Runtime adapters

[fields.mjs](../tools/shared/fields.mjs) adds persistent `aria-invalid`/`aria-describedby` errors while preserving native validation, focus and existing helper associations. Errors clear on valid input/change and form reset. `setFieldError(control, message, optionalRecheck)` also supports existing application validation that native HTML does not express: Tracker's HTTP/HTTPS/credential rule and Builder's trimmed revision request. These adapters reuse existing rules and do not introduce new persistence rules.

[status.mjs](../tools/shared/status.mjs) provides `setAlert(element, {message, variant, announcement})`. Messages are rendered as text. `announcement` is `polite`, `assertive` or `off`.

[notifications.mjs](../tools/shared/notifications.mjs) exposes only:

```js
showToast({ variant: 'success', message: 'Details saved.', dismissible: true, duration: 4000 });
dismissToast(id);
```

`showToast` returns an identifier. Success/info default to 4000ms; warning/danger default to persistent (`duration: 0`). At most three toasts are mounted; additional items queue in order, oldest first. Matching variant/message pairs deduplicate across visible and queued items. Queued items have no running timer or announcement. Each admitted item has a single live announcement, including its severity; duplicates do not announce again.

Timers pause during pointer hover and keyboard focus, and resume with the remaining duration. A timer also checks actual focus before dismissal. Appearance never moves focus. Manual keyboard dismissal returns focus to another visible close control or the previous connected element when possible. Close and API dismissal affect only the requested item.

Desktop positioning is bottom-right; mobile uses horizontal insets, with safe-area offsets. Entry/exit uses a 180ms fade and 4px vertical movement; remaining items reposition over 180ms. Reduced motion removes translation/reposition animation and uses a 150ms fade.

## Adoption and files changed

| File | Change |
| --- | --- |
| [tools/shared/components.css](../tools/shared/components.css) | Opt-in fields, labels/helpers/errors, native select, four Alert/Toast variants, Toast close/stack, Spinner and reduced-motion styles. |
| [tools/shared/fields.mjs](../tools/shared/fields.mjs) | Native and existing custom field-error associations/clearing. |
| [tools/shared/status.mjs](../tools/shared/status.mjs) | Safe inline Alert adapter and shared severity icon names. |
| [tools/shared/notifications.mjs](../tools/shared/notifications.mjs) | Small in-memory Toast manager. |
| [tools/resume-tailor.html](../tools/resume-tailor.html) | Job/contact/notes/revision field adoption; persistent validation, generation/revision/download errors; accessible loading; generation/download success Toasts; inline handoff notices. |
| [tools/career-radar/ui.js](../tools/career-radar/ui.js) | Editor inputs/native selects, separate associated labels/helpers, inline handoff Alerts and loading Spinner. |
| [tools/career-radar/app.js](../tools/career-radar/app.js) | Inline auth/save/status failures, whitespace/URL field errors, save/status/sign-out Toasts. |
| [tools/career-radar/index.html](../tools/career-radar/index.html) | Login label/input adoption, preserving types, autocomplete and required attributes. |
| [tools/career-radar/ingestion-ui.js](../tools/career-radar/ingestion-ui.js) | Posting URL adoption, associated source hints, loading Spinner and persistent retrieval Alerts. |
| [tools/career-radar/styles.css](../tools/career-radar/styles.css) | Retained local layout/textarea heights; legacy feedback styling excludes shared Alerts. |
| [tools/career-radar/eslint.config.js](../tools/career-radar/eslint.config.js) | Existing lint configuration also covers the new browser `.mjs` test. |
| [tools/career-radar/tests/browser/inputs-status.mjs](../tools/career-radar/tests/browser/inputs-status.mjs) | Dependency-free local Chrome acceptance checks with synthetic data and mocked generation. |
| This report | Contract, migration, validation and limitations. |

Routine create/edit/status confirmations use Toasts and no longer duplicate inline confirmations. Save/retrieval/auth/generation/revision/download failures remain inline. Handoff confirmation stays beside its action; Builder receive/decline/error information stays inline. Revision's existing short “Done” status remains inline, without a duplicate Toast.

Deliberately unchanged: Builder's rich document-preview tailoring notes, QA callouts and revision highlights; PDF/DOCX/ATS/export formatting and generation prompts/payloads; chips, tabs, progress and shared navigation; Tracker's board/status badges, disclosure controls, ingestion review/duplicate panels and specialized ingestion action buttons; bootstrap setup failure fallback. Builder has no native select to migrate. Career Radar's placeholder is unchanged. Auth/data access, status history triggers, duplicate decisions and handoff payload/storage mechanisms remain unchanged.

## Validation

Passed:

- Tracker `npm run typecheck`, `npm run lint`, all **86 existing tests**, and direct lint of the three new shared modules.
- Reusable browser acceptance: **36 field state/theme combinations** (three controls × six states × two themes), primary entered text, placeholder/disabled/error colors, 1px borders, 2px focus/offset, textarea resize and native label association. Native required validation, helper-preserving error association/reset, custom URL validation and clearing, and long multiline/Unicode/inert markup text.
- All four Alert and Toast variants in both themes; flexible multiline Alerts; Toast-specific surface, border and shadow. Queue order/max-three/dedup, queued cancellation, manual and timed dismissal, persistent warning/danger, optional close, focus/hover pause, native Enter dismissal and focus return, mobile wrapping, reduced motion and spinner geometry.
- Builder's synthetic streaming generation, failure/Start Over/retry, success confirmation, blank/whitespace revision validation, persistent revision failure and stopped spinner, Start New cleanup. Separate regression checks covered native chip Space/Enter, focus-selection payload, keyboard tabs, successful cover-letter revision/busy handling, persistent download error/recovery and all 48 existing Button state/size/theme combinations.
- Real libraries generated PDF, résumé/cover-letter/ATS DOCX and ZIP from synthetic output. Format signatures and nonempty files were checked; package handler and restored button state passed. Export functions and formatting were unchanged.
- Tracker fixture auth/create/edit/save/status/Applied/Done/board/sign-out, failed-save draft preservation/retry, native select typeahead, ingestion/review/save, Applied disclosure and duplicate detection. Duplicate preview did not write; explicit separate save did. Invalid required/HTTP URL submissions did not write.
- Complete/repeated Builder handoffs, exact 375k+ description, missing optional fields, existing draft confirmation accept/decline, unrelated settings preservation, expired/malformed/missing payloads, blocked storage/popups, standalone navigation and GitHub Pages project-relative paths. Sending/receiving did not write prospect data.
- Actual app screenshots with loaded fonts reviewed in Light/Dark at 390px and 1280px. Narrow regression checks also included 320px. No horizontal overflow in the tested layouts.
- `git diff --check` and shared-token reference check. No hosted user records accessed or mutated.

Run the committed acceptance script with the existing synthetic fixture server and an isolated Chrome debugging session:

```sh
node tools/career-radar/tests/fixtures/radar-server.js
# In another terminal (macOS):
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --headless=new --remote-debugging-port=9229 \
  --user-data-dir=/private/tmp/nextchapter-phase2b-chrome \
  --no-first-run --no-default-browser-check about:blank
# In a third terminal:
node tools/career-radar/tests/browser/inputs-status.mjs
```

The acceptance script uses only the local fixture for auth/prospects and mocks generation. It permits the existing Google font styles for narrow-layout checks. It creates and closes its own test tabs. Other export/handoff regression checks were session-local; no new test framework or dependency was added.

## Contrast and remaining limits

Current rendered pairs were measured with the existing temporary pinned `apca-w3@0.1.9` evaluator, outside the repository. Approximate 8-bit canvas samples, foreground first; hover alpha is composited on the actual raised card:

| Pair | Light signed Lc | Dark signed Lc |
| --- | ---: | ---: |
| Entered value / input background | +99.78 | −103.32 |
| Entered value / hover background | +94.07 | −99.63 |
| Placeholder / input background | +76.23 | −47.70 |
| Toast label / raised surface | +103.32 | −101.89 |
| Success Alert | +81.95 | −66.46 |
| Danger Alert | +79.49 | −60.76 |
| Warning Alert | +80.26 | −70.94 |
| Info Alert | +93.67 | −57.21 |

Primary entered values retain strong separation during editing. Toast labels retain primary contrast independently of severity. Placeholder examples and compact 12px Alert/helper text still warrant human readability review, particularly Dark; the implementation follows the current tokens and specified typography without inventing new colors, weights or global contrast thresholds. See the [APCA reevaluation](apca-contrast-reevaluation.md) for the distinction between perceptual guidance and WCAG criteria; its historical measurements were not rewritten.

Validation used desktop Chrome with emulated narrow viewports and reduced motion. Native popup appearance varies by platform. Actual screen-reader announcement timing, Safari/Firefox, physical mobile safe-area hardware, font-specific readability and full WCAG conformance were not verified. Generation tests used synthetic mocked API output, not live model calls. Export regressions checked generated files/signatures and handler behavior, not a new rendered-document audit. No hosted deployment was performed.
