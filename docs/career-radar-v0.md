# Career Radar v0: Database Foundation

The repository now contains the approved two-table migration and typed Supabase/data-access foundation. There is no UI, discovery, scraping, URL ingestion, AI assessment, résumé integration, or application automation. The hosted project has not been changed by this implementation.

The existing résumé builder, proxy Worker, deployment workflow, and career-context files remain unchanged. Radar's npm package is scoped to `tools/career-radar/`; the existing static site still needs no build step.

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

GitHub Pages cannot access runtime environment variables. When a UI is later authorized, its deployment must generate this public module from deployment variables, then import it into the entry point. The current Pages workflow is deliberately unchanged and does not generate it yet.

The JavaScript uses the npm import `@supabase/supabase-js`. A future no-build browser entry point will need an import map to a pinned browser-compatible SDK matching `package.json`, or another explicitly reviewed dependency-loading approach. No HTML, import map, bundler, or UI entry point is added in this foundation.

## Apply the migration

The migration creates tables/functions and privileges; it does not provision a login or alter hosted Auth settings.

From the repository root, after configuring operator credentials and `SUPABASE_PROJECT_REF` in your shell:

```sh
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push --dry-run
supabase db push
```

Review the dry run before applying. Use CLI login if `SUPABASE_ACCESS_TOKEN` is not configured. Allow the CLI to prompt for the database password, or supply it through `SUPABASE_DB_PASSWORD`; do not put it in a command argument or committed file. Linking metadata in `supabase/.temp/` is ignored.

Alternatively, apply the complete checked-in SQL file through the Supabase SQL Editor. Do not alter its contents ad hoc in the dashboard. Prefer CLI application so migration tracking remains consistent; do not then run CLI push over a manually applied migration without reconciling its history.

In the hosted Auth settings, disable public signup and provision your one email/password user. `supabase/config.toml` disables signup for local development; it does not change the hosted project's settings. The future application will use Supabase Auth + RLS, not the Worker's origin allowlist or `TAILOR_KEY`.

## Generated types

[database.types.ts](../tools/career-radar/database.types.ts) is a bootstrap snapshot generated by applying the migration to embedded PostgreSQL (PGlite) and introspecting its columns. It is not a claimed export from the hosted project. Do not hand-edit it.

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

The SDK manages persistent Auth sessions. This foundation provides no login UI; the future application must sign in via `client.auth.signInWithPassword` before accessing private records. Public credentials alone grant no record access.

| Function | Contract |
| --- | --- |
| `listProspects()` | Paginated board fields, ordered by creation time descending and ID ascending |
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

Hosted migrations, hosted type generation, and authenticated hosted integration tests have not been run. No configured publishable key, hosted login, or operator credentials were used. Apply the migration and regenerate hosted types before wiring the future UI. The PostgreSQL harness and SDK tests are separate checks, not substitutes for that deployment validation.
