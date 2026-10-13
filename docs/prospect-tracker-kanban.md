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

`kanban.js` adds native HTML Drag and Drop only at 900px and above with a fine pointer and hover support. Touch pointer presses disable card dragging; scrolling is never intercepted. It marks the source, highlights valid destination columns, requests the native move cursor and clears feedback after same-column/outside/canceled drops. It adds no ordering field or sorting behavior. Applied keeps its existing date/recency sort and ten-card preview; expanded Applied/Done state and board horizontal scroll survive optimistic redraws and rollback. Card links and the editor’s status selector remain the keyboard/non-drag alternatives.

Done drops leave the card in its original column and open a compact, fixed-position chooser anchored below the destination heading. It is appended to `body` to escape board overflow. Passed, Rejected, Withdrawn and Closed are the only outcome buttons. Focus starts at Passed; Tab, arrow keys, Home/End and Escape are supported. Cancel, Escape, outside click, scroll, resize, route changes and session changes dismiss without writing. Choosing an outcome closes the chooser and uses the same optimistic path as direct drops. This is a purpose-built drop chooser, not a general StatusPicker.

Both editor selection and board moves call the shared `createStatusSaver()` gate in `status-save.js`. It delegates to the existing `data.changeStatus(id, status, exactUpdatedAt)` function: Supabase Auth/RLS remain the ownership boundary, the exact microsecond revision guards the write, and the database trigger creates atomic append-only status history. No browser history writes, timestamp formatting, schema changes or extra metadata writes are introduced. The gate blocks duplicate/competing saves. Board cards/counts update before the result, then merge the returned row/revision on success or restore the original array on failure. Errors use persistent danger Toasts; stale revisions instruct the user to Refresh. Route/session epoch checks prevent old results from repainting another view.

## Files

| Files | Responsibility |
| --- | --- |
| `tools/shared/tokens.css`, `tools/shared/components.css` | Shared badge tokens and six visual classes. |
| `tools/career-radar/prospect-status.js` | Central status-to-tone map. |
| `tools/career-radar/view-model.js` | Column membership/defaults and drop resolution. |
| `tools/career-radar/kanban.js` | Desktop drag feedback, local Done chooser and cleanup. |
| `tools/career-radar/status-save.js` | Shared status persistence gate. |
| `tools/career-radar/ui.js`, `tools/career-radar/styles.css` | Badge adoption, board rendering/state and drop/chooser styling. |
| `tools/career-radar/app.js` | Optimistic board updates, rollback and editor integration. |
| `tools/career-radar/index.html`, `tools/career-radar/bootstrap.js` | Matching browser asset revisions. |
| `tools/career-radar/tests/prospect-status.test.js`, `tools/career-radar/tests/status-save.test.js` | Mapping/no-op resolution, save serialization, revisions, failure/retry and session gating. |
| `docs/prospect-tracker-kanban.md`, `docs/career-radar-v0.md` | Current behavior and validation. |

## Validation

- Scoped typecheck, lint, all **94 Node tests**, and `git diff --check` pass.
- Local Chrome native mouse drags against the existing synthetic Supabase SDK/PGlite fixture covered Prospects→Applied, In-Process→Prospects, Prospects→In-Process, explicit Done outcome, same-column no-op and outside-drop cleanup. No hosted records were changed.
- An unresolved Done drop produced no additional request or history event. Arrow navigation, Escape with focus restoration, outside dismissal and explicit Withdrawn selection were verified. The saved outcome survived reload; card click opened the editor and showed its trigger-recorded history.
- Simulated direct/Done save failures restored the original status and counts with an error Toast. A second client’s competing write produced a stale-revision rollback; Refresh loaded the new stored value.
- Applied’s ten-card preview expanded to eleven draggable cards. A failed move temporarily crossing the ten-card boundary restored all eleven and the expanded state.
- The editor kept an unsaved title through a status change, then saved details using the new returned revision. All card draggables became false at 390px with no page-level horizontal overflow. Badges were checked against Figma in both themes.
- Native browser acceptance used Chrome on desktop plus a responsive mobile viewport. Real mobile devices and other browser engines were not tested; mobile drag-and-drop is intentionally out of scope. Hosted Supabase acceptance was not performed because persistence/schema are unchanged.
