# Status badges and board moves

The [Status-Badge component](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=134-13529) uses 20px height, 4px/6px padding, 2px corners and Inter Regular 12/12 typography. Figma binds both themes to the same primitive colors: neutral/200, secondary/100, primary/200, success/50, danger/50 and warning/50 backgrounds, with neutral/900 foregrounds. The requested `--ds-badge-{tone}-bg/fg` contract is defined in shared tokens; shared `.nc-status-badge` classes consume it. Badges are noninteractive spans on cards, the editor’s saved status and status-history entries.

`tools/prospect-tracker/prospect-status.js` owns the status-to-tone mapping:

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

`BOARD_COLUMNS` and `resolveBoardDrop()` in `view-model.js` own column membership and drop behavior. Same-column drops reorder cards while preserving their exact grouped statuses. Cross-column drops retain the existing status behavior below.

| Column | Stored statuses | Cross-column drop |
| --- | --- | --- |
| Prospects | prospect, interested, legacy applying | prospect |
| Applied | applied | applied |
| In-Process | recruiter, interviewing, final, offer | recruiter |
| Done | passed, rejected, withdrawn, closed | Explicit outcome choice |

`kanban.js` adds native HTML Drag and Drop only at 900px and above with a fine pointer and hover support. Touch pointer presses disable card dragging; scrolling is never intercepted. It marks the source, highlights valid destination columns, requests the native move cursor and clears feedback after same-column/outside/canceled drops. Same-column dragging shows an insertion line and uses the saved manual order in every column; every loaded card remains available. Done retains its separate disclosure; horizontal board scroll and each column’s vertical scroll survive result updates and rollback. Card links and the editor’s status selector remain available; Alt+Up/Down on a focused card reorders it without changing status.

Done drops leave the card in its original column and open a compact, fixed-position chooser anchored below the destination heading. It is appended to `body` to escape board overflow. Passed, Rejected, Withdrawn and Closed are the only outcome buttons. Focus starts at Passed; Tab, arrow keys, Home/End and Escape are supported. Cancel, Escape, outside click, scroll, resize, route changes and session changes dismiss without writing. Choosing an outcome closes the chooser and uses the same optimistic path as direct drops. This is a purpose-built drop chooser, not a general StatusPicker.

Both editor selection and board moves call the shared `createStatusSaver()` gate in `status-save.js`. It delegates to the existing `data.changeStatus(id, status, exactUpdatedAt)` function: Supabase Auth/RLS remain the ownership boundary, the exact microsecond revision guards the write, and the database trigger creates atomic append-only status history. Status transitions introduce no browser history writes or timestamp formatting; the separate ordering operation below never writes status. The gate blocks duplicate/competing saves. Board cards/counts update before the result, then merge the returned row/revision on success or restore the original array on failure. Save errors use persistent danger Toasts; stale revisions show an inline conflict message with a contextual Reload board action. The main toolbar has no Refresh button. Route/session epoch checks prevent old results from repainting another view.

## Manual order — Issue #1 (local, October 16, 2026)

[Issue #1](https://github.com/rainbows4dinos/nextchapter/issues/1) uses the [latest Tracker board](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/nextchapter?node-id=216-20454) as its visual reference. The existing layout, shared tokens, native drag behavior, grouped statuses and Done disclosure remain. The new insertion overlay uses the focus-ring token without shifting card geometry, including at the clipped edges of independently scrolling lists.

Manual order is the default in every column. New prospects and prospects entering another lifecycle column go to the top. Status changes within a grouped column, detail edits and application-date changes retain position. The migration seeds existing cards from their previous creation/date ordering; Applied dates remain labels rather than ongoing sort criteria. Search is a subsequence of the saved order. Both reorder input paths are disabled whenever the trimmed filter is nonempty. A visible instruction explains this and the Alt+Up/Down shortcut; keyboard focus survives successful saves and the shared status Toast announces completion. Native dragging remains desktop-only; keyboard ordering also works at narrow widths. Card activation is suppressed briefly after dragging, including when an optimistic status update replaces the card nodes.

[20261016010000_prospect_board_order.sql](../supabase/migrations/20261016010000_prospect_board_order.sql) adds `board_position` and the authenticated `reorder_prospect_column` RPC. An internal sequence allocates top positions through a private trigger. Clients cannot directly insert/update position. The RPC explicitly scopes every read/write to `auth.uid()`, serializes owner reorder requests, locks column rows, and accepts only a permutation of the complete current column. A stale order or membership returns a conflict. It changes positions only; the existing revision trigger still advances exact `updated_at` values, so stale detail edits remain guarded. It never updates status or writes status history. Following a save, the browser refetches positions and revisions. Failures retain/refetch the saved board and show a persistent error; ambiguous responses are never replayed automatically. Changes from another device appear on board reload, consistent with existing behavior; no realtime subscription is introduced.

**Release status:** the user approved the database migration on October 16, 2026. The CLI dry run identified only `20261016010000_prospect_board_order.sql`; it was applied to the linked hosted project and registered in migration history. Hosted-generated public database types now replace the local snapshot. Catalog checks confirmed the column, trigger, index, fixed-search-path definer, authenticated-only RPC execution, denied direct position writes, inaccessible private sequence and existing RLS. A private pre/post snapshot comparison outside the repository verified every prospect field except the added position and expected `updated_at` advance; status history, profiles and opportunity records matched exactly. Typecheck and lint passed with hosted types. No synthetic records or reorder operations were written to production. The frontend remains local and undeployed; its release and authenticated hosted reorder acceptance still require separate approval. The frontend requires the new column/RPC.

Validation: scoped typecheck, lint, all 172 Node tests, and diff whitespace checks pass. PostgreSQL tests cover new-at-top behavior, saved order, invalid/duplicate/missing IDs, stale requests, grouped and cross-column status changes, denied direct position writes, owner isolation and anonymous denial. SDK tests cover the exact RPC request, persisted order across independent clients and stale-client conflicts; a pre-existing-data migration test checks the backfill and unchanged ledger. The [browser acceptance script](../tools/prospect-tracker/tests/browser/board-order.mjs) uses the existing synthetic Auth/SDK/PGlite fixture: trusted Chromium mouse drag plus DragEvents, insertion geometry, keyboard/focus, reload persistence, filter lock/clear, accidental click suppression, unchanged history, failed save recovery, cross-column moves and the Done chooser. Both themes and widths 390/600/900/1440px pass. No hosted data is involved; full Supabase/PostgREST, other browser engines and real touch devices remain unverified.

Reproduce browser acceptance with the disposable fixture (`node tools/prospect-tracker/tests/fixtures/radar-server.js`, port 8777), an isolated Chrome profile with remote debugging on 9229, then `node tools/prospect-tracker/tests/browser/board-order.mjs`. The script uses only the synthetic account, resets its six fixture cards, and writes visual checks to `/tmp/nextchapter-board-order.png` and `/tmp/nextchapter-board-insertion.png`.

## Files

October 13, 2026 toolbar simplification: removed the persistent Refresh button. Add Prospect and filtering remain. Conflicting board moves now show an inline message with Reload board; it reloads saved records while retaining board state. Local browser validation covered filtering, Add Prospect/back navigation, a native drag after a competing synthetic edit, rollback and contextual reload with the updated saved title and retained query. Typecheck, lint and diff whitespace checks passed. This toolbar change has not been deployed.

| Files | Responsibility |
| --- | --- |
| `tools/shared/tokens.css`, `tools/shared/components.css` | Shared badge tokens and six visual classes. |
| `tools/prospect-tracker/prospect-status.js` | Central status-to-tone map. |
| `tools/prospect-tracker/view-model.js` | Column membership/defaults, central ordering, search/counts and drop resolution. |
| `tools/prospect-tracker/kanban.js` | Desktop dragging, insertion feedback, keyboard ordering, local Done chooser and cleanup. |
| `tools/prospect-tracker/status-save.js` | Shared status persistence gate. |
| `tools/prospect-tracker/ui.js`, `tools/prospect-tracker/styles.css` | Badge adoption, persistent search toolbar, result updates, viewport/column scrolling and drop/chooser styling. |
| `tools/prospect-tracker/app.js` | Status optimism/rollback, guarded order saves/refetch, and editor integration. |
| `supabase/migrations/20261016010000_prospect_board_order.sql`, `tools/prospect-tracker/data.js` | Owner-scoped persistent ordering and typed RPC access. |
| `tools/prospect-tracker/index.html`, `tools/prospect-tracker/bootstrap.js` | Matching browser asset revisions. |
| `tools/prospect-tracker/tests/view-model.test.js`, `tools/prospect-tracker/tests/prospect-status.test.js`, `tools/prospect-tracker/tests/status-save.test.js` | Search/count/order coverage, mapping/no-op resolution, save serialization, revisions, failure/retry and session gating. |
| `docs/prospect-tracker-kanban.md`, `docs/career-radar-v0.md` | Current behavior and validation. |

## Viewport scrolling and search

Option 01's hierarchy remains: page title/description, section heading, compact action/search toolbar, then board. At widths of at least 900px and heights of at least 600px, the page uses a `100vh`/`100dvh` flex column. The suite header and board heading stay outside the flexible board; the shell, workspace, board and lists use `min-height:0`. Columns stretch to the remaining height, with persistent headers above independently scrolling `.column-cards` containers. Stable scrollbar gutters keep content clear. Done retains its native disclosure with a flexible `::details-content` box. Smaller or shorter viewports retain document scrolling and the existing horizontal column widths. No JavaScript height calculations are used.

`searchBoardGroups()` applies existing centralized column ordering before filtering by trimmed, case-insensitive company/title substrings. It retains all four columns and their unfiltered totals. The section heading reports the total loaded prospects; active search shows column counts as **X of Y**. A compact muted toolbar count sits immediately left of the search field: **2 of 54 matches**, **1 of 54 matches**, or **No matches**. It is hidden when search is inactive; there is no standalone count row. A custom inline × button named **Clear search** replaces the external button, suppresses the native cancel control, supports keyboard activation/focus styling and restores input focus. Add Prospect uses a shared Lg button with a 16px icon; the filter uses the shared 40px input height and a centered 32px inline clear control. The field has a fixed 280px basis capped at its container width, so its width stays the same with or without a query/count. On narrow screens the search group can wrap, preserving input width. Empty columns distinguish no prospects from no matches; a global miss retains the board and inline clear action. Filtering makes no per-keystroke requests and disables both drag and keyboard reordering; clearing it restores the complete saved order. Cross-column status dragging remains available while filtered.

The search input and scroll containers stay mounted during result/status updates. Only card children and counts change, preserving focus, caret and raw query. In-memory state retains query, Done disclosure, horizontal scroll and each list's vertical scroll across contextual board reloads and editor navigation. Updates capture and restore actual scroll positions; browser clamping when content shrinks is accepted. A successful move reveals the matching card with nearest scrolling and opens Done when needed; other columns retain their positions. State resets when switching owners. Drag handlers remount after result updates to use current cards/revisions. Native `dragenter` cancellation lets nested scrolling destinations accept drops; status resolution and the body-mounted chooser remain unchanged. Applied preview/toggle state and its mutation observer are removed.

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

Search toolbar polish was checked with a temporary 54-card synthetic preview: exact two/one/zero-match labels, inactive/whitespace message hiding, one visible clear icon, Tab focus ring, Enter/mouse clearing with input focus restoration, desktop themes, and 390px/320px layouts without page-width overflow. Typecheck/lint and all 95 tests pass. No search matching/state or drag/scroll logic changed.
