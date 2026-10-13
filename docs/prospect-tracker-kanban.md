# Status badges and board moves

The [Status-Badge component](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=134-13529) uses 20px height, 4px/6px padding, 2px corners and Inter Regular 12/12 typography. Figma binds both themes to the same primitive colors: neutral/200, secondary/100, primary/200, success/50, danger/50 and warning/50 backgrounds, with neutral/900 foregrounds. The requested `--ds-badge-{tone}-bg/fg` contract is defined in shared tokens; shared `.nc-status-badge` classes consume it. Badges are noninteractive spans on cards, the editor’s saved status and status-history entries.

`tools/career-radar/prospect-status.js` owns the status-to-tone mapping:

| Tone | Status values |
| --- | --- |
| neutral | prospect, passed, withdrawn, closed |
| accent | interested, applied |
| active | recruiter, interviewing, legacy applying |
| positive | offer |
| negative | rejected |
| highlight | final (labelled Final round) |

No status values or history are renamed. Applying remains readable for old records and is not selectable. Badge geometry and all six resolved colors were checked in local Chrome in both themes against Figma’s theme bindings. The mapping coverage test, typecheck, lint and diff checks pass.

## Column resolution and persistence

`BOARD_COLUMNS` and `resolveBoardDrop()` in `view-model.js` own column membership and drop behavior. Every same-column drop is a no-op, preserving the exact grouped status and existing ordering.

| Column | Stored statuses | Cross-column drop |
| --- | --- | --- |
| Prospects | prospect, interested, legacy applying | prospect |
| Applied | applied | applied |
| In-Process | recruiter, interviewing, final, offer | recruiter |
| Done | passed, rejected, withdrawn, closed | Explicit outcome choice |

`kanban.js` adds native HTML Drag and Drop only at 900px and above with a fine pointer and hover support. Touch pointer presses disable card dragging; scrolling is never intercepted. It marks the source, highlights valid destination columns, requests the native move cursor and clears feedback after same-column/outside/canceled drops. It adds no ordering field or sorting behavior. Applied keeps its existing date/recency sort and renders every loaded card. Done retains its separate disclosure; horizontal board scroll and each column’s vertical scroll survive result updates and rollback. Card links and the editor’s status selector remain the keyboard/non-drag alternatives.

Done drops leave the card in its original column and open a compact, fixed-position chooser anchored below the destination heading. It is appended to `body` to escape board overflow. Passed, Rejected, Withdrawn and Closed are the only outcome buttons. Focus starts at Passed; Tab, arrow keys, Home/End and Escape are supported. Cancel, Escape, outside click, scroll, resize, route changes and session changes dismiss without writing. Choosing an outcome closes the chooser and uses the same optimistic path as direct drops. This is a purpose-built drop chooser, not a general StatusPicker.

Both editor selection and board moves call the shared `createStatusSaver()` gate in `status-save.js`. It delegates to the existing `data.changeStatus(id, status, exactUpdatedAt)` function: Supabase Auth/RLS remain the ownership boundary, the exact microsecond revision guards the write, and the database trigger creates atomic append-only status history. No browser history writes, timestamp formatting, schema changes or extra metadata writes are introduced. The gate blocks duplicate/competing saves. Board cards/counts update before the result, then merge the returned row/revision on success or restore the original array on failure. Errors use persistent danger Toasts; stale revisions instruct the user to Refresh. Route/session epoch checks prevent old results from repainting another view.

## Files

| Files | Responsibility |
| --- | --- |
| `tools/shared/tokens.css`, `tools/shared/components.css` | Shared badge tokens and six visual classes. |
| `tools/career-radar/prospect-status.js` | Central status-to-tone map. |
| `tools/career-radar/view-model.js` | Column membership/defaults, central ordering, search/counts and drop resolution. |
| `tools/career-radar/kanban.js` | Desktop drag feedback, local Done chooser and cleanup. |
| `tools/career-radar/status-save.js` | Shared status persistence gate. |
| `tools/career-radar/ui.js`, `tools/career-radar/styles.css` | Badge adoption, persistent search toolbar, result updates, viewport/column scrolling and drop/chooser styling. |
| `tools/career-radar/app.js` | Optimistic board updates, rollback and editor integration. |
| `tools/career-radar/index.html`, `tools/career-radar/bootstrap.js` | Matching browser asset revisions. |
| `tools/career-radar/tests/view-model.test.js`, `tools/career-radar/tests/prospect-status.test.js`, `tools/career-radar/tests/status-save.test.js` | Search/count/order coverage, mapping/no-op resolution, save serialization, revisions, failure/retry and session gating. |
| `docs/prospect-tracker-kanban.md`, `docs/career-radar-v0.md` | Current behavior and validation. |

## Viewport scrolling and search

Option 01's hierarchy remains: page title/description, section heading, compact action/search toolbar, then board. At widths of at least 900px and heights of at least 600px, the page uses a `100vh`/`100dvh` flex column. The suite header and board heading stay outside the flexible board; the shell, workspace, board and lists use `min-height:0`. Columns stretch to the remaining height, with persistent headers above independently scrolling `.column-cards` containers. Stable scrollbar gutters keep content clear. Done retains its native disclosure with a flexible `::details-content` box. Smaller or shorter viewports retain document scrolling and the existing horizontal column widths. No JavaScript height calculations are used.

`searchBoardGroups()` applies existing centralized column ordering before filtering by trimmed, case-insensitive company/title substrings. It retains all four columns and their unfiltered totals. The section heading reports the total loaded prospects; active search shows column counts as **X of Y** and a board result summary. Empty columns distinguish no prospects from no matches. A global miss retains the board with a clear message and Clear search action. There are no per-keystroke requests, new persisted fields, manual ordering or additional filters.

The search input and scroll containers stay mounted during result/status updates. Only card children and counts change, preserving focus, caret and raw query. In-memory state retains query, Done disclosure, horizontal scroll and each list's vertical scroll across Refresh and editor navigation. Updates capture and restore actual scroll positions; browser clamping when content shrinks is accepted. A successful move reveals the matching card with nearest scrolling and opens Done when needed; other columns retain their positions. State resets when switching owners. Drag handlers remount after result updates to use current cards/revisions. Native `dragenter` cancellation lets nested scrolling destinations accept drops; status resolution and the body-mounted chooser remain unchanged. Applied preview/toggle state and its mutation observer are removed.

## Current scrolling/search validation

- Typecheck, lint, all **95 Node tests**, and `git diff --check` pass. Search coverage includes company/title-only matching, case/whitespace/partial matches, counts, no results, unchanged order and all 31 Applied records beyond the retired preview limit.
- Chrome used 72 disposable synthetic prospects with the existing Supabase SDK/PGlite fixture. At 1440×900, columns fill the board without page vertical overflow; headers stay visible and Applied/Done lists scroll independently. Keyboard ArrowDown scrolls a focused list. Empty filtered columns retain their full height. No preview controls remain.
- Search retained focus and a mid-string caret; title and company queries, Clear search, normal/filtered counts and a global miss were checked. Refresh and editor navigation/status changes retained query and Applied scroll position.
- Native drags covered filtered moves from a vertically scrolled Applied list, a horizontally scrolled board in a test-only constrained shell, same-column no-op, Done Withdrawn selection, Escape cancellation and chooser dismissal on column scroll. The chooser remained fixed under `body`, outside overflow clipping.
- Simulated save failure restored status/counts with a danger Toast while retaining the query and an unrelated column's exact scroll position. Existing persistence/revision/history tests pass.
- Both desktop themes were checked. At 390px, all 72 loaded cards remained accessible, lists used natural document height, horizontal board scrolling worked, page width equaled viewport width, and all card draggables were false.
- No hosted records were changed. Browser checks used Chrome and responsive viewports; real mobile devices and other engines were not tested. Mobile dragging remains out of scope. Schema, status values and history semantics are unchanged.

## Earlier status-badge and move validation

- Scoped typecheck, lint, all **94 Node tests**, and `git diff --check` pass.
- Local Chrome native mouse drags against the existing synthetic Supabase SDK/PGlite fixture covered Prospects→Applied, In-Process→Prospects, Prospects→In-Process, explicit Done outcome, same-column no-op and outside-drop cleanup. No hosted records were changed.
- An unresolved Done drop produced no additional request or history event. Arrow navigation, Escape with focus restoration, outside dismissal and explicit Withdrawn selection were verified. The saved outcome survived reload; card click opened the editor and showed its trigger-recorded history.
- Simulated direct/Done save failures restored the original status and counts with an error Toast. A second client’s competing write produced a stale-revision rollback; Refresh loaded the new stored value.
- The former Applied preview was validated with expansion and rollback across the ten-card boundary; that presentation limit is now removed.
- The editor kept an unsaved title through a status change, then saved details using the new returned revision. All card draggables became false at 390px with no page-level horizontal overflow. Badges were checked against Figma in both themes.
- Native browser acceptance used Chrome on desktop plus a responsive mobile viewport. Real mobile devices and other browser engines were not tested; mobile drag-and-drop is intentionally out of scope. Hosted Supabase acceptance was not performed because persistence/schema are unchanged.
