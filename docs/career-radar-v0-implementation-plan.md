# Career Radar v0 Implementation Plan

Status: proposed implementation plan; no application or database implementation is authorized by this document.

Progress note: the user subsequently authorized the database and typed data-access foundation only. That foundation is implemented in the repository; hosted migration application and the UI remain outstanding. See [foundation setup and validation](career-radar-v0.md). The configuration section below describes the original proposal; the implemented foundation follows the later requirement to supply public settings through environment variables and generate an ignored public-config module.

## Milestone and scope

Manual Add Prospect → persistent Supabase storage → Kanban board → prospect detail/editing → status transitions/history.

Build Career Radar as a separate static page beside the résumé builder, using plain JavaScript modules and direct Supabase access through Auth + row-level security (RLS). Keep the existing Pages deployment and résumé application intact.

The repository currently has no router, package manifest, frontend framework, or build step. Introducing those would expand this milestone unnecessarily.

Do not implement automated job discovery, scraping, AI assessment, URL ingestion, résumé tailoring, or application automation in this milestone. Supabase owns job-search state. The existing repository remains the canonical source for career history, experience, preferences, and evidence.

## Location and routes

Put the application at `tools/career-radar/index.html`. Its hosted URL will be:

```text
/career-context/tools/career-radar/
```

Use hash routes so direct links and reloads work on GitHub Pages without server rewrites:

| Route | View |
| --- | --- |
| `#/board` | Kanban board |
| `#/prospects/new` | Add prospect |
| `#/prospects/<uuid>` | Prospect details, editing, and history |

An empty hash redirects to the board. Authentication is a gate around these views, not a separate route: after signing in, resume the requested view.

Add a link from README. Defer navigation changes to the résumé builder; Radar can link back to it.

## Client and server boundaries

| Responsibility | Location |
| --- | --- |
| Rendering, routing, forms, draft state | Browser |
| Login, session persistence, logout | Supabase Auth client |
| Prospect reads and writes | Supabase Data API |
| Ownership, validation constraints, timestamps | PostgreSQL |
| Status-event creation | PostgreSQL trigger |
| Private career-search records | Supabase |

For this slice, the Cloudflare Worker needs no changes. Radar does not need Anthropic or runtime career-context loading yet.

Use one manually provisioned email/password account, with public signup disabled. That avoids adding OAuth configuration or email-link delivery to the milestone. Supabase supports email/password sign-in directly. See [Auth documentation](https://supabase.com/docs/guides/auth/passwords).

RLS must enforce ownership regardless of what the browser requests. Login visibility alone is not access control.

## Supabase organization and configuration

Create one browser client in `supabase-client.js`, using a pinned Supabase JS release. Import that singleton through the data-access layer and authentication controller; UI rendering functions should not make database calls.

Use `config.js` for two public settings:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

The URL is already known:

```text
https://liwszkldtfxihoyipbai.supabase.co
```

The publishable key remains to be supplied. These settings are public browser configuration, not secrets. Publishable keys are intended for client applications, with access controlled through authentication and database policies. See [API key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

No application environment variables are required at runtime: GitHub Pages cannot read a server `.env` file. Avoid adding an environment-injection build step just to publish two public settings.

Migration and type-generation tooling will need authenticated CLI access to the project. Keep database passwords and management credentials in the operator's shell or credential tooling, outside the repository and Pages artifact. No service-role key is needed by Radar.

Let Supabase manage session persistence. Store no prospect records or unsaved drafts in local storage for v0, and clear rendered private data on logout.

## Database and generated types

Implement the accepted two-table model:

- `prospects`: manual job details, nullable assessment fields, JSONB connections, current status, ownership, and timestamps.
- `prospect_status_events`: initial status and subsequent transitions.

Include RLS, grants, constraints, timestamps, ownership protection, and the history trigger in the initial migration. Do not expose browser insert/update/delete access to the events table.

Generate `database.types.ts` from the implemented database schema. Supabase generates row, insert, and update definitions through database introspection. See [type-generation documentation](https://supabase.com/docs/guides/api/rest/generating-types).

Use those definitions through JSDoc imports in Radar's JavaScript. Add a small application type and runtime validator for the connections array. Maintain the allowed status list in `model.js`; generated text fields will not produce a status union automatically.

This provides useful editor assistance without converting the résumé application or introducing a TypeScript build.

## Data-access layer

Keep a small, explicit set of functions in `data.js`:

| Function | Behavior |
| --- | --- |
| `listProspects()` | Fetch card fields in stable creation-time/ID order |
| `getProspect(id)` | Fetch full details |
| `createProspect(input)` | Insert and return the saved row |
| `updateProspect(id, patch, expectedUpdatedAt)` | Save editable fields with stale-edit protection |
| `changeStatus(id, status, expectedUpdatedAt)` | Persist one transition and return the saved row |
| `listStatusEvents(prospectId)` | Fetch history ordered by event ID |

No generic repository abstraction, ORM, client cache framework, or realtime subscription.

Updates should:

- Whitelist editable fields.
- Normalize optional blank fields to null.
- Include the loaded `updated_at` in their condition.
- Request the updated row back.
- Treat zero affected rows as a stale or unavailable record—not successful saving.

Use a client-generated UUID for prospect creation. Keep it across retries so an uncertain network response cannot create duplicate cards. After an ambiguous failure, check that ID before retrying.

## Views and components

Use ordinary DOM rendering functions, grouped in one `ui.js` initially:

| Component | Purpose |
| --- | --- |
| Login view | Email/password, pending state, errors |
| Application header | Board navigation, Add Prospect, logout |
| Kanban board and columns | Group cards by the twelve canonical statuses |
| Prospect card | Company, title, location/arrangement, open action |
| Prospect form | Shared create/edit fields |
| Connections editor | Add, edit, and remove embedded connections |
| Status control | Select status and explicitly confirm the change |
| History list | Initial status and subsequent transitions |
| Feedback region | Loading, save results, errors, conflict messages |

The add form requires only company and title. Other job fields remain optional. Put secondary details behind a simple expandable section so adding a prospect stays quick.

The detail view supports editing job details, notes, connections, and status. Keep assessment columns in the database but defer the scoring UI from this milestone.

Use twelve status columns with horizontal scrolling on desktop and a usable narrow-screen layout. No board configuration or saved card positions.

## Status persistence and history

Use an explicit status selector and **Change status** button in the detail view. Skip drag-and-drop in v0. It adds interaction, accessibility, and rollback work without improving the architecture proof.

On confirmation:

1. Disable the status control while the request is pending.
2. Update the prospect using stale-edit protection.
3. The database trigger records the transition in the same transaction.
4. Replace the local row with the returned saved row.
5. Refresh history and update the card's column.

Do not move the card before the database confirms success. On failure, keep its previous status and offer retry.

The trigger creates `NULL → initial status` on insertion and an event only when status actually changes. Editing notes or resaving the same status creates no event.

Use a narrowly scoped trigger function with explicit table references, a fixed search path, and restricted privileges. The browser cannot call a general privileged history-writing function.

`applied_on` remains independently editable. Entering `applied` can prompt for the date; it must not silently overwrite an existing date.

## Loading, error, and empty states

| Situation | Expected behavior |
| --- | --- |
| Initial load | Resolve authentication before displaying private views |
| Signed out | Login view |
| Board loading | Loading message; do not briefly claim the board is empty |
| No prospects | “Add your first prospect” action |
| Empty column | Small empty state |
| Detail/history loading | Separate loading states |
| Read failure | Error with retry |
| Save pending | Disable duplicate submission; preserve draft |
| Save failure | Retain entered values and show actionable error |
| Stale edit | Explain the conflict; preserve draft and offer reload |
| Missing/inaccessible prospect | “Prospect unavailable” with board link |
| Session expires | Require sign-in; preserve the draft in memory |
| Logout | Clear records and drafts from the application |
| Navigation with unsaved changes | Confirm discard |

Render user-entered content as text. Job and contact links should allow only HTTP/HTTPS URLs. No Markdown or rich-text renderer is necessary.

## Implementation sequence

1. **Record the accepted design and setup instructions.** Document the two-table model, Auth + RLS approach, public configuration, and scope.
2. **Create the database migration.** Tables, constraints, grants, RLS, timestamp/ownership handling, and atomic status history.
3. **Verify database behavior locally.** Establish that ownership and history work before building the UI.
4. **Apply the reviewed migration to the project and provision your login.** Configure public signup as disabled.
5. **Generate types and create the client/data layer.** Prove authenticated create/read/update operations.
6. **Build login → add → board.** This is the first complete persistence check: add a prospect and reload.
7. **Add details, editing, and connections.** Include draft preservation and stale-edit handling.
8. **Add explicit status changes and history.** Confirm that the board and event list survive reload.
9. **Run acceptance checks and document deployment.** Publish through the existing Pages workflow when authorized.

## Expected files

Paths in the table are relative to the repository root.

| Action | Files |
| --- | --- |
| Create app shell and styling | `tools/career-radar/index.html`, `tools/career-radar/styles.css` |
| Create routing/auth controller | `tools/career-radar/app.js` |
| Create rendering and forms | `tools/career-radar/ui.js` |
| Create validation and vocabularies | `tools/career-radar/model.js` |
| Create Supabase configuration/client | `tools/career-radar/config.js`, `tools/career-radar/supabase-client.js` |
| Create data access | `tools/career-radar/data.js` |
| Generate types | `tools/career-radar/database.types.ts` |
| Create database setup | `supabase/config.toml`, `supabase/migrations/<timestamp>_career_radar_v0.sql` |
| Create focused checks | `supabase/tests/career_radar.test.sql`, `tools/career-radar/tests/model.test.js` |
| Document setup and acceptance | `docs/career-radar-v0.md` |
| Update repository documentation | `README.md`, `AGENTS.md` |
| Ignore CLI temporary artifacts | `.gitignore` |

Keep `CLAUDE.md`, résumé code, Worker code, career-context files, and the Pages workflow unchanged.

This planning document is separate from the future setup/acceptance guide, `docs/career-radar-v0.md`. File paths listed above describe planned work, not files already created.

## Testing strategy

Concentrate automation on failure modes that could lose or expose data:

- **Database tests:** unauthenticated access blocked; another user cannot access records or history; ownership cannot be transferred; constraints enforced; initial event created; exactly one event per real transition; unchanged status creates none; browser cannot alter history.
- **Small JavaScript tests:** validation, optional-field normalization, connection shape, and safe URL handling. Use Node's built-in test runner.
- **Browser acceptance:** sign in, create, reload, edit, add a connection, change status, inspect history, reload again, sign out. Also test a failed save and conflicting edits in two tabs.
- **Deployment check:** reload a direct detail hash URL under the GitHub Pages project path.
- **Résumé regression smoke check:** existing page still opens and its context loading and Download Package flow remain intact.

Use synthetic fixtures in committed tests. Start with manual browser acceptance rather than adding a browser-test framework to this first slice.

## Completion criterion

The milestone is complete when a manually entered prospect, its edits, connections, current status, and transition history reliably return after reload—with ownership enforced by Supabase.
