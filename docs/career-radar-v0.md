# Career Radar v0: Manual Prospect Tracking

Career Radar now has a static UI for sign-in, a board grouping twelve canonical statuses into five lifecycle columns, manual prospect creation, core details/notes editing, explicit status changes, and status history. Greenhouse URL-to-preview ingestion is deployed with a separately deployed authenticated Edge Function; see [its setup, validation and limits](career-radar-greenhouse-ingestion.md). Ashby/Lever adapters are deployed with authenticated hosted acceptance; see [their validation, deployment and acceptance results](career-radar-ashby-lever-ingestion.md). The approved two-table migration was applied to the hosted project on October 6, 2026; public signup is disabled. There is no discovery, arbitrary-site scraping, AI, assessment editor, connection editor, résumé integration, or application automation.

The résumé builder has one new navigation link to Radar. Its logic, the proxy Worker, and career-context files are unchanged. Radar's npm package remains scoped to `tools/career-radar/`; Pages adds only public configuration generation, without a frontend build step or dependency installation.

## Use the application

Open [Career Radar](../tools/career-radar/index.html) through a web server, or follow its link from the résumé builder. Sign in using the one provisioned Supabase Auth email/password user (separate from your Supabase dashboard login). There is no signup or password-reset UI.

- `#/board`: five lifecycle columns with counts and prospect cards. **Prospects** groups prospect/interested; **Applying** and **Applied** each retain their own column; **In Process** groups recruiter/interviewing/final/offer; **Done** groups passed/rejected/withdrawn/closed. Cards in grouped columns display their exact saved status. Done is visually quieter and collapsed on each board render; select its heading to expand it. The columns fit desktop widths and scroll horizontally on smaller screens. Refresh explicitly to see changes made elsewhere.
- `#/prospects/new`: only company and role are required. Enter manually or retrieve an editable Greenhouse, Ashby or Lever posting preview. Notes and URL are immediately available; other core fields are under **More job details**, which opens for a retrieved preview. Source is optional free text with channel suggestions; compensation supports multiple lines.
- `#/prospects/<uuid>`: edit details and notes, open a safe job link, or use **Change status**. Status saves separately from details; applied date is not inferred.

Applied shows ten cards by default, retaining its full header count. **Show all N** expands the full column; **Show fewer** restores the preview. Known `applied_on` dates come first, newest first. Undated prospects follow, ordered by `discovered_on` when present or `created_at` otherwise. Ties use creation time descending, then UUID ascending. Creation time is a fallback for visibility only, not an inferred application date; edits do not move undated prospects merely because `updated_at` changed. Every prospect is still fetched and remains available through the full column or its detail route.

Cards with a saved `applied_on` date show **Applied Oct 1, 2026** beneath the role/status, in any lifecycle column. The calendar date is formatted without a timezone shift. Unknown dates have no date label; discovery/creation timestamps are never displayed as application dates. Location and work arrangement remain editable in prospect details but are omitted from board cards.

Saves wait for database confirmation. Failed saves retain the draft; conflicts retain it and offer **Reload saved prospect**, which explicitly discards the draft. Create retries reconcile the same UUID before attempting another insert. Unsaved navigation and reload prompt before discarding. Drafts live only in memory and are lost on a confirmed reload or sign-out. Auth sessions persist through the SDK; prospect state lives in Supabase. A signed-out event clears private views and drafts in every open Radar tab.

The UI builds user content with DOM text nodes, never HTML interpretation. It uses the résumé builder's font/color/radius tokens and shared `theme` preference without extracting or refactoring the builder's styles.

## Schema

The SQL to apply is [20261006000000_career_radar_v0.sql](../supabase/migrations/20261006000000_career_radar_v0.sql).

### `public.prospects`

| Fields | Type and meaning |
| --- | --- |
| `id` | UUID primary key; callers retain one UUID across create retries |
| `owner_id` | Required UUID referencing `auth.users`; defaults to the authenticated user; not writable by the browser |
| `company`, `title` | Required nonblank text |
| `job_url`, `source`, `location`, `employment_type` | Optional text |
| `work_arrangement` | Optional `remote`, `hybrid`, `onsite`, or `flexible` |
| `compensation_text` | Optional original compensation range/type wording; no premature numeric parsing |
| `job_description`, `notes` | Optional plain text |
| `posted_on`, `discovered_on`, `applied_on` | Optional calendar dates; unknown stays null |
| `status` | Required checked text, defaults to `prospect` |
| `connections` | JSONB array, defaults to `[]` |
| `experience_fit`, `level_fit`, `compensation_fit`, `consumer_fit`, `domain_fit`, `craft_interaction_fit`, `systems_fit`, `work_style_fit`, `logistics_fit`, `relationship_strength`, `overall_assessment`, `personal_interest` | Independent nullable small integers, 1–5 |
| `assessment_rationale`, `assessment_concerns` | Optional text |
| `created_at`, `updated_at` | Database-managed timestamps; identity, ownership, and creation time are immutable |

Scores do not default to 3. Personal interest is separate from professional fit; overall assessment is manual, not an average. History, experience, preferences, and supporting evidence stay in the existing repository context files. Supabase stores judgments about particular opportunities.

A connection is `{ id, name, role?, relationship?, contact?, notes? }`, with a stable UUID and nonblank name. Application validation checks the shape and duplicate IDs; the database enforces that the container is an array. Do not bypass application validation when writing connection objects through another client.

### `public.prospect_status_events`

| Field | Type and meaning |
| --- | --- |
| `id` | Database identity bigint; used to order the ledger |
| `prospect_id` | Required foreign key to the prospect |
| `from_status` | Nullable only for the initial trigger-created event |
| `to_status` | Required checked status |
| `recorded_at` | Database timestamp of recording, not a backdated real-world event time |

Canonical statuses are `prospect`, `interested`, `applying`, `applied`, `recruiter`, `interviewing`, `final`, `offer`, `passed`, `rejected`, `withdrawn`, and `closed`. Skipping stages and reopening are allowed. `passed` is your decision not to pursue; `rejected` is the employer's decision; `withdrawn` is leaving an active process; `closed` is an ended/unavailable opportunity.

Insertion creates an initial event. Actual status changes append events in the same transaction; unchanged status and ordinary edits do not. The browser has no history mutation API or permission. Parent deletion is restricted to preserve history; no application delete operation is implemented.

RLS limits authenticated users to their own prospects and associated history. Column grants prohibit setting ownership/timestamps and prohibit deleting records. A restricted trigger function in `career_radar_private` creates history; it is not a browser RPC. Indexes cover prospect ownership and history by prospect/ID.

## Environment configuration

| Variable | Required for | Visibility |
| --- | --- | --- |
| `SUPABASE_URL` | Client and public-config generation | Public project endpoint |
| `SUPABASE_PUBLISHABLE_KEY` | Client and public-config generation | Public publishable key; a legacy `anon` JWT is also supported |
| `SUPABASE_PROJECT_REF` | CLI link and hosted type generation | Public project identifier |
| `SUPABASE_ACCESS_TOKEN` | Operator CLI access, unless already logged in | Secret; operator tooling only |
| `SUPABASE_DB_PASSWORD` | CLI linking/pushing when required | Secret; operator tooling only |

Get the URL and publishable key from the project's Supabase Connect/API settings. The URL provided in this session is intentionally not embedded in application source. There is no service-role credential requirement.

Export public variables into the shell; [.env.example](../tools/career-radar/.env.example) documents their names but is not loaded automatically. Keep actual secret values in external credential tooling, not an `.env` file inside this public repository. Git ignores alone do not define a safe Pages publishing boundary.

From `tools/career-radar/`:

```sh
npm ci
npm run config:generate
```

The generator validates the environment and writes ignored `public-env.js` containing only the URL and public key. It refuses secret/service-role keys and does not serialize the rest of the environment. This file contains public configuration, but remains uncommitted so environments can differ.

GitHub Pages cannot access runtime environment variables. Configure GitHub repository **Variables** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in **Settings → Secrets and variables → Actions**. The Pages workflow generates the module before uploading the static site. No operator token, database password, or service-role key belongs in those application variables. If either public variable is absent, the résumé builder deploys and Radar shows a setup/connection error. Invalid values or secret keys fail the entire deployment, including new résumé updates; Pages keeps serving its last successful deployment. This fail-closed behavior is deliberate.

`index.html` maps `@supabase/supabase-js` to the committed browser module at `vendor/supabase.js`. It contains the pinned npm package's standalone bundle plus a single ESM export; no SDK code is fetched from a CDN at runtime. Licenses, hashes, and update instructions are in [vendor/README.md](../tools/career-radar/vendor/README.md). After a reviewed SDK update, run `npm ci`, `npm run vendor:generate`, and `npm run vendor:check`, then review and commit the generated assets. Pages needs no npm installation or SDK generation. There is no frontend bundler.

`bootstrap.js` loads public configuration and the application; missing configuration or a missing SDK asset produces a reload/setup error. For local use, generate configuration, then serve the repository root (for example, `python3 -m http.server 8000`) and open `/tools/career-radar/`. Avoid `file://` URLs, which cannot load the module application correctly.

## Apply the migration

The migration creates tables/functions and privileges; it does not provision a login or alter hosted Auth settings.

From the repository root, after configuring operator credentials and `SUPABASE_PROJECT_REF` in your shell:

```sh
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push --dry-run
supabase db push
```

Review the dry run before applying. Use CLI login if `SUPABASE_ACCESS_TOKEN` is not configured. Allow the CLI to prompt for the database password, or supply it through `SUPABASE_DB_PASSWORD`; do not put it in a command argument or committed file. Linking metadata in `supabase/.temp/` is ignored.

Alternatively, apply the complete checked-in SQL file through the Supabase SQL Editor. Do not alter its contents ad hoc in the dashboard. Prefer CLI application so migration tracking remains consistent; do not then run CLI push over a manually applied migration without reconciling its history. For this initial migration only, [register_career_radar_v0.sql](../supabase/manual/register_career_radar_v0.sql) records its version after SQL Editor application. This operational script belongs outside `migrations/` and must not replace applying the actual schema.

In the hosted Auth settings, disable public signup and provision your one email/password user. `supabase/config.toml` disables signup for local development; it does not change the hosted project's settings. Radar uses Supabase Auth + RLS; the Worker's origin allowlist and `TAILOR_KEY` do not govern access to prospects.

## Generated types

[database.types.ts](../tools/career-radar/database.types.ts) was generated and downloaded from the hosted project's dashboard on October 6, 2026, after applying the migration. It includes `public`, the dashboard's `graphql_public` definitions, and the hosted PostgREST version. Do not hand-edit it. CLI generation below intentionally targets `public` only.

Without CLI authentication, use **Integrations → Data API → Docs → Tables and Views / Introduction → Generate and download types**, then replace `database.types.ts` with the downloaded file and run typecheck. See [Supabase's type-generation documentation](https://supabase.com/docs/guides/api/rest/generating-types).

After applying the migration, from `tools/career-radar/`:

```sh
npm run types:generate
npm run typecheck
```

This invokes the installed Supabase CLI with `SUPABASE_PROJECT_REF`, generates types for the public schema, checks that both Radar tables exist, and writes the file only on success. A failed generation cannot truncate the existing snapshot. Operator CLI authentication is required; application public keys do not authorize schema introspection.

For regenerating the bootstrap snapshot without a hosted connection:

```sh
npm run types:local-snapshot
```

Generated types describe structure, not RLS, grants, score ranges, or the exact JSONB connection shape. JSDoc narrows statuses, score inputs, and connection types; runtime validation and PostgreSQL constraints provide the corresponding checks.

## Typed client and data access

Create one client with `createRadarClient(env)` from `supabase-client.js`, then pass it to `createRadarDataAccess(client)` from `data.js`. Environment settings are supplied explicitly; the browser module does not read `process.env` or create an unconfigured client on import.

The SDK manages persistent Auth sessions. The UI signs in via `client.auth.signInWithPassword` before accessing private records. Public credentials alone grant no record access. Auth callbacks defer database reads until outside the SDK's auth lock.

| Function | Contract |
| --- | --- |
| `listProspects()` | All paginated board fields, including application/discovery dates; fetched by creation time descending and ID ascending, with Applied presentation ordering in the view-model |
| `listProspectIdentities()` | All paginated, owner-scoped UUID/company/title/job URL/location/status/application date/exact revision fields for duplicate review; independent of board preview limits |
| `getProspect(id)` | Full prospect including assessment and validated connections; null if missing/inaccessible |
| `createProspect(input)` | Requires retained UUID, company, title; database supplies owner/timestamps; returns saved row |
| `updateProspect(id, patch, expectedUpdatedAt)` | Whitelisted detail/assessment/connection patch; never changes status or ownership |
| `updateAssessment(id, patch, expectedUpdatedAt)` | Scores/rationale/concerns only; no derived scoring |
| `setConnections(id, connections, expectedUpdatedAt)` | Validates/replaces the embedded list with revision protection |
| `changeStatus(id, status, expectedUpdatedAt)` | Updates current status only; trigger creates any event |
| `listStatusEvents(prospectId)` | Paginated, ordered by event ID; read-only |

Pass the exact `updated_at` string returned by Supabase, including microseconds. Do not round-trip it through JavaScript `Date`. Zero updated rows throw `StaleProspectError`; permission/network/database errors propagate rather than returning false success.

`undefined` leaves a field unchanged, nullable fields can be cleared with `null`, and blank optional text normalizes to null. Dates use `YYYY-MM-DD`. Job links accept HTTP/HTTPS only, without embedded credentials. Contact is plain text; URI-like values are checked before becoming links.

Create operations are not automatically retried. Retain the same UUID and check `getProspect(id)` after an uncertain network response before retrying. Never convert a duplicate create into an overwrite.

## Validation

From `tools/career-radar/`:

```sh
npm run typecheck
npm run lint
npm test
```

Tests include:

- Compile-time contracts for required fields, scores, statuses, ownership, connections, and read-only history.
- Configuration validation and exclusion of secret credentials.
- Real Supabase SDK queries with mocked HTTP responses: exact revision guards, patches, error propagation, create reconciliation, pagination, and status/history boundaries.
- PostgreSQL execution of the actual migration and [SQL assertions](../supabase/tests/career_radar.sql): owner defaults, RLS across two users, anonymous denial, immutable ownership, constraints, preserved application dates, revisions, skipped/reopened statuses, denied history mutations, and rollback when an event write fails.
- Application/database vocabulary checks for all statuses, work arrangements, and assessment score columns.
- Board grouping covers all twelve canonical statuses exactly once, retains empty lifecycle columns, and preserves card identity, canonical status, exact revision strings, and other lifecycle groups' input order.
- Applied ordering covers known dates, undated discovery/creation fallbacks, deterministic ties, and preservation of null dates/revisions. Preview tests cover ten-card boundaries, expansion/collapse across 31 prospects without data loss, and uncapped other lifecycle groups.

The embedded database harness models Supabase's roles and `auth.uid()` contract. It does not exercise actual JWT verification, hosted Auth, PostgREST, or the complete Supabase stack. HTTP query tests use the real SDK but mocked responses; they do not establish hosted API connectivity.

For a full local Supabase stack, install/run Docker, then from the repository root:

```sh
supabase start
supabase db reset
supabase db lint --local
```

Run resets only against a disposable local database. The plain SQL assertion file can also be executed with `psql -v ON_ERROR_STOP=1 -f supabase/tests/career_radar.sql` against that disposable migrated database. It rolls back synthetic fixtures and requires administrative access for role/privilege assertions. Do not run the fixture test against the live project.

### Validation limits in this implementation environment

Docker and standalone PostgreSQL tools are unavailable. The Supabase CLI lint was attempted; after a sandbox-blocked connection was retried outside the sandbox, it failed with connection refused at `127.0.0.1:54322`. No full-stack CLI database lint is claimed.

### Hosted setup verified October 6, 2026

- Applied the unchanged `20261006000000_career_radar_v0.sql` through the signed-in dashboard's SQL Editor; execution succeeded.
- Ran the checked-in manual registration script and verified migration version `20261006000000`, name `career_radar_v0`, in Supabase's migration history. Do not reapply this migration to this project.
- Verified two RLS-enabled tables, four policies, and two prospect triggers. Anonymous SELECT is denied; authenticated detail/status column grants are present, while ownership insertion and prospect deletion are denied.
- Disabled hosted public signup; the Auth settings API reports `disable_signup: true`. Anonymous sign-ins remain disabled.
- Verified the public application configuration against the hosted API: both table reads return HTTP 401 / PostgreSQL `42501` (permission denied), rather than missing-table errors. No private rows were retrieved or synthetic fixtures inserted into the live database.
- Downloaded hosted TypeScript definitions through the dashboard and replaced the bootstrap snapshot. Typecheck, lint, and all 18 local tests passed.

The vertical slice is **user-confirmed manually on the hosted project**, following the user's report that everything works. Codex has not independently verified the provisioned user or performed automated authenticated hosted acceptance; that automated coverage remains outstanding. Creating the password requires the user's direct entry in the dashboard; do not put it in repository files or chat. The CLI still lacks an operator login, so future CLI pushes/type generation require `supabase login` or an external operator token. The PostgreSQL harness and SDK tests remain separate checks, not substitutes for authenticated hosted validation.

### Vertical-slice validation

Typecheck, lint, and all 68 tests pass; the ingestion function also passes its Deno typecheck/lint and four tests. See [Greenhouse validation](career-radar-greenhouse-ingestion.md#validation) for the original coverage and [Ashby/Lever validation](career-radar-ashby-lever-ingestion.md#validation-and-acceptance) for the latest local and hosted checks. Existing UI tests cover route validation, grouping canonical statuses into lifecycle columns without mutating records, Applied ordering and preview expansion, application-date labels without timezone shifts or inferred dates, core form normalization without overwriting assessments/connections/status, and actionable network errors. Data-access tests use the actual vendored browser SDK. Additional checks verify vendored bytes/licenses/provenance against the locked npm package and exercise SDK sign-in, persistent session restoration, authenticated requests, and sign-out using synthetic HTTP responses.

Browser acceptance used the real browser application and pinned Supabase SDK with a disposable local HTTP fixture backed by PGlite running the actual migration, roles, RLS, and triggers. Its Auth responses were synthetic; it did not connect to the hosted project. Verified:

- Sign in, empty board, manual add, open details, edit, explicit status change, and initial/transition history.
- Direct detail reload retains saved values/status/history and SDK session; the board places the card under the saved status.
- A failed save retains the draft; retry saves it. A competing save in a second tab produces a conflict without overwriting that revision.
- Unsaved navigation asks once before discarding; sign-out returns to login. Both light and dark board layouts were visually inspected.
- Résumé builder opens with its existing form and fetched emphasis options; its Radar link and Radar's return link work. Generation/export was not rerun because the only builder change is navigation.

After vendoring the SDK, a Chrome smoke check against the same disposable local fixture verified sign-in, prospect creation, session restoration and saved details after reload, status changes/history, board grouping, and sign-out with the repository-served module.

The five-column lifecycle presentation was checked separately in Chrome using the real view-model, renderer, and stylesheet with synthetic records and no database connection. All five columns fit at 1024px and 1280px without horizontal overflow; at 390px scrolling remains inside the board. Verified light/dark layouts, empty and completed-only boards, grouped status labels, mouse/keyboard Done expansion, completed-card navigation, all twelve editor status options, and collapse after refresh. This presentation check does not establish hosted persistence.

Applied's preview was checked with 31 synthetic applications, including null application dates. Verified ten-card descending-date preview, full total count, mouse/keyboard expansion to all 31, collapse back to ten, undated-card navigation with a blank applied-date field, and no toggle for exactly ten records. Expansion/collapse also worked at 390px without page-width overflow. No hosted data was used or changed.

No fixture records or credentials were written to hosted Supabase by the local tests. Hosted v0 Auth/CRUD is user-confirmed manually. On October 7, authenticated browser acceptance on deployed Pages verified Greenhouse retrieval, Cancel without writes, one explicitly authorized real prospect save, reload/history and duplicate navigation; see [the hosted results](career-radar-greenhouse-ingestion.md#hosted-acceptance--october-7-2026). All pre-existing prospects and history were unchanged. A separate hosted manual create, competing-edit checks and full status-transition acceptance remain open; the ingestion check does not close those broader coverage gaps. No additional migration is needed for this UI.

### Deliberate compromises

The board groups statuses for presentation only; the editor still offers all twelve canonical statuses, and Supabase records/history are unchanged. Applied and Done expansion is not saved across refreshes or navigation. Application-age labels are not implemented. There is no filtering, drag-and-drop, realtime subscription, or saved ordering. Refresh or revisit the board for another tab's changes. Details and status save independently. There is no delete, assessment editor, connection editor, signup, or password-recovery UI. Existing assessment/connection data is preserved by core edits. Drafts do not survive a confirmed reload/sign-out. Fonts still load through Google Fonts; all Radar JavaScript is served from the repository. The small stylesheet mirrors builder tokens rather than introducing a shared design system.

Greenhouse ingestion is deployed. The latest authorized [Ashby/Lever milestone](career-radar-ashby-lever-ingestion.md) is deployed and stops for review before Workday. Its hosted results and remaining limits are recorded in the linked guide. Manual connection editing remains a separate future milestone; broader authenticated hosted acceptance gaps are recorded above.
