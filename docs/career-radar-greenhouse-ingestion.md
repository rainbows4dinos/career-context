# Career Radar: Greenhouse URL ingestion

Implemented October 7, 2026. Local validation is complete; the Edge Function has **not been deployed or tested against hosted Supabase**. No schema migration or generated database-type regeneration is needed.

## Use

On **Add prospect**, paste a hosted Greenhouse job link and select **Retrieve posting**. Retrieval produces an editable preview; it never saves a prospect. Review extracted fields, missing-field labels, and warnings, then select **Save prospect** or **Cancel**. Company and title remain required. The manual form works without the function being deployed.

Supported links use `boards.greenhouse.io/<board>/jobs/<id>`, `job-boards.greenhouse.io/<board>/jobs/<id>`, or `/embed/job_app?for=<board>&token=<id>` on those hosts. HTTPS only. Tracking parameters, fragments and the two hosted aliases normalize to `https://job-boards.greenhouse.io/<board>/jobs/<id>`. Custom employer URLs, regional Greenhouse hosts, board listings and other ATS platforms are unsupported; their original input remains visible for manual entry.

**Source** is an optional discovery channel, with suggestions and arbitrary text allowed. It is never filled with the ATS provider. Manual ingestion initializes **Discovered date** to the date first captured in Radar, using UTC; it is editable. The pipeline also accepts an explicit caller-supplied discovery date for future reuse. Applied date, assessment and connections are not inferred. New prospects use the existing `prospect` default.

Likely duplicates show their saved status/application information and matching reason. Choose **Open existing**, **Save separately**, or **Cancel**; nothing is merged. Opening existing retains the normal unsaved-draft confirmation. Normal Save cannot bypass duplicate review. The query fetches all accessible identities, independently of Applied's ten-card preview, and runs again immediately before saving. New candidates or changed matching fields invalidate the previous separate-save decision. An uncertain create is reconciled by its retained UUID before duplicate checking or retrying.

## Architecture and files

| Location | Responsibility |
| --- | --- |
| `supabase/functions/job-ingest/index.ts` | Deno entry point, exact-origin configuration, public-key configuration, verified owner authentication |
| `supabase/functions/job-ingest/deno.json`, `deno.lock` | Pinned server dependencies and integrity lock |
| `tools/career-radar/ingestion/greenhouse-url.js` | Strict hosted URL recognition and internally constructed API destination |
| `tools/career-radar/ingestion/bounded-fetch.js` | Streamed byte limits and redirect/status handling |
| `tools/career-radar/ingestion/greenhouse.js` | UI/database-independent retrieval, inert description parsing, fact normalization and provenance |
| `tools/career-radar/ingestion/handler.js` | Testable HTTP/authentication boundary and overall deadline |
| `tools/career-radar/ingestion-client.js` | Authenticated SDK invocation and runtime response validation |
| `tools/career-radar/duplicate-match.js` | Pure identity/company/title comparison |
| `tools/career-radar/ingestion-ui.js` | Loading/cancel, editable preview, field-origin labels and explicit duplicate decisions |
| `data.js`, `app.js`, `ui.js`, `styles.css` | Paginated identity reads and integration with the existing create/editor flow |

Shared modules live inside Radar's scoped package so Node and Deno use the same JavaScript and parser dependencies without creating another npm package. They are imported by the Edge Function, not coupled to the Add Prospect UI. Backend parser/handler modules are not loaded by the browser. Type-only references in `model.js` now use the actual `.ts` database snapshot path so both checkers resolve them; the generated snapshot is unchanged.

The response contains only a whitelisted partial detail draft plus original/canonical/retrieval URLs, provider/board/posting/requisition identities, retrieval time, extraction method, field sources and warnings. The browser validates this boundary and saves only form fields through `readDetails()` and `createProspect()`. Metadata is ephemeral; no ingestion table, raw posting archive, notes encoding or database write occurs at retrieval time. Existing revisions, RLS and history triggers remain authoritative.

Created files:

- `supabase/functions/job-ingest/index.ts`, `index.test.ts`, `deno.json`, `deno.lock`.
- `tools/career-radar/ingestion/greenhouse-url.js`, `bounded-fetch.js`, `greenhouse.js`, `handler.js`.
- `tools/career-radar/ingestion-client.js`, `duplicate-match.js`, `ingestion-ui.js`.
- `tools/career-radar/tests/ingestion.test.js`, `ingestion-persistence.test.js`, `fixtures/radar-server.js`, `fixtures/greenhouse/posting.json`.
- `docs/career-radar-greenhouse-ingestion.md`.

Modified files:

- `AGENTS.md`, `README.md`, `docs/career-radar-v0.md`, and the previously saved/untracked `docs/career-radar-url-ingestion-plan.md`.
- `supabase/config.toml`.
- `tools/career-radar/app.js`, `data.js`, `ui.js`, `styles.css`, `model.js`, `tsconfig.json`, `eslint.config.js`, `package.json`, `package-lock.json`, `tests/data.test.js`.

No migration, generated database snapshot, Pages workflow, résumé application, Worker or career-context file was changed.

## Retrieval and normalization

The function requests one individual public posting, including pay-transparency fields, from `boards-api.greenhouse.io`. It never fetches the pasted destination or follows the returned `absolute_url`. Hosted posting ID and requisition ID remain separate identities. See the [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html).

Company, title, location, description and first-publication date are used only when supported. Work arrangement is recognized conservatively from an explicit, unambiguous location label, never inferred from a city or scattered description keywords. Employer-defined custom metadata is not interpreted as standardized employment type. Unknown fields remain blank.

Descriptions are parsed inertly with pinned `htmlparser2`/`entities`; paragraphs and lists survive, while scripts and embedded active content are discarded. Greenhouse's entity-encoded descriptions are decoded before parsing when necessary. Nothing executes and no resources are loaded. All preview content is rendered as DOM text.

All supported compensation tiers and explanatory blurbs are retained in a multiline field. The API supplies cents/currency but no interval; no annualization or annual/hourly label is inferred. Missing or malformed ranges produce warnings. `first_published` supplies the posting calendar date; `updated_at` is never substituted.

## Security and bounds

- Platform `verify_jwt = true` remains enabled. The handler independently verifies the bearer session through the fixed project's Auth user endpoint using a **public** key, rejects anonymous identities and restricts access to `RADAR_OWNER_ID`. A publishable key or Origin alone grants no retrieval access. See [Supabase function authentication](https://supabase.com/docs/guides/functions/auth).
- Exact allowed browser origins; no wildcard. CORS is separate from authentication. Authenticated non-browser callers can reuse the endpoint without an Origin header.
- The sole job-site destination is the internally constructed HTTPS Greenhouse API URL. No arbitrary-host DNS lookup, private-network fetch, redirect following, upstream canonical-link following, cookies or forwarded Radar credentials. The user's session goes only to Supabase Auth.
- JSON request body: **4 KiB** streamed limit; pasted URL: **2,048 characters**; posting response: **1 MiB** streamed limit; Auth response: **32 KiB**. Oversized content is rejected, not truncated. Only `{ "url": "..." }` is accepted.
- **15-second** overall handler deadline including Auth and streamed reads; **20-second** browser cancellation deadline. One Auth request plus at most one posting request. Cancel is available during retrieval and disabled during a save; canceling cannot retract a save already sent.
- JSON responses use `Cache-Control: no-store`. The application adds no token, URL-query or posting-body logging. No privileged key or admin client is used. Supabase may still collect platform request metadata under its own logging behavior.
- No distributed rate limiting, durable quotas or external counter was added, per the approved scope. Verified single-owner access and bounded work limit exposure but do not prevent an authenticated caller from issuing many concurrent requests. Add durable distributed limiting before automated discovery or broader usage.

## Deploy and configure

GitHub Pages and the Edge Function deploy separately. The existing Pages workflow and browser `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` settings are unchanged. This function adds **no browser secret** and requires no frontend build or parser installation on Pages.

1. Find your provisioned Radar user's UUID under **Supabase → Authentication → Users**. This is the application account, not the dashboard account.
2. Create an operator environment file **outside this public repository** (for example, `/Users/Shared/career-radar-private/job-ingest.env`), containing:

   ```dotenv
   RADAR_PUBLISHABLE_KEY=<same public/publishable key used by Radar>
   RADAR_OWNER_ID=<the provisioned Auth user UUID>
   RADAR_ALLOWED_ORIGINS=https://rainbows4dinos.github.io,http://localhost:8000,http://127.0.0.1:8000
   ```

   Use the Pages **origin**, without `/career-context` or a trailing slash. Include only the localhost ports you actually use. The platform supplies `SUPABASE_URL`; never set a service-role key for this feature. Missing/invalid settings fail closed; manual tracking remains available.

3. With the Supabase CLI authenticated, run from the repository root:

   ```sh
   supabase login
   supabase secrets set --project-ref liwszkldtfxihoyipbai --env-file /Users/Shared/career-radar-private/job-ingest.env
   supabase functions deploy job-ingest --project-ref liwszkldtfxihoyipbai --use-api
   ```

   `--use-api` permits server-side bundling without Docker. Keep the checked-in import map/configuration and JWT verification enabled. Do not use `--no-verify-jwt`. Operator login/access tokens stay outside source files. The [Supabase deployment guide](https://supabase.com/docs/guides/functions/deploy) covers deployment.

4. Publish the static changes through the existing Pages workflow. Then sign in and dogfood one current Greenhouse link: retrieve, cancel (no row), retrieve again, edit, save, reload and inspect history. Repeat the same URL to check duplicate choices. Also check an unavailable posting and a disallowed host. Hosted authenticated function/deployment acceptance is still outstanding.

For a full local Supabase stack, `supabase functions serve job-ingest --env-file <private-file>` uses the same handler; configure the local public key and local Auth user UUID. Docker is required for that stack. The disposable fixture below is an independent substitute for browser-flow checks, not actual gateway/JWT deployment coverage.

## Validation

From `tools/career-radar/`:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run functions:typecheck
npm run functions:lint
npm run test:functions
```

The pinned Deno CLI is a scoped development dependency. Node tests exercise actual production modules with sanitized deterministic JSON/HTML; Deno checks/tests use the same modules and pinned server imports. Frozen Deno validation requires the committed lock; the first run may download those public npm packages.

Results on October 7: **45/45 Node tests**, **2/2 Deno tests**, both typechecks and both linters pass. Coverage includes URL/SSRF boundaries, aliases/tracking, missing facts/compensation, salary tiers, remote restrictions, description entities/paragraphs/lists, invalid dates and identity mismatches, unsupported/expired jobs, upstream/network failures, streamed size/deadline limits, Auth/owner/CORS boundaries, conservative duplicates, complete identity pagination, response-field rejection and no retrieval write requests.

An authenticated loopback test uses the real vendored SDK, the actual migration in PGlite, owner RLS and triggers. It proves retrieving/discarding a preview creates no row/event, failed create leaves its input intact, retry uses the retained UUID and creates exactly one prospect and initial event. The sandbox initially denied binding localhost; the test passed when rerun with loopback access. No failing assertion remains.

To reproduce browser acceptance without credentials or hosted writes:

```sh
node tests/fixtures/radar-server.js
```

Open the printed local URL and use **radar@example.invalid / fixture-only-password** (synthetic only). Synthetic Greenhouse links under `/example/jobs/12345` provide full facts, `/54321` provides the same role under a different ID, `/67890` lacks company/optional facts, `/404` is unavailable, and `/99999` is delayed. The loopback-only `/__fixture` endpoint reports counts; POST `/__fixture/fail-next-save` injects one disposable save failure. Stop with Ctrl-C to discard the in-memory database. This harness supplies synthetic Auth and a limited PostgREST facsimile; it does not claim full Supabase service coverage.

Chrome acceptance verified editable extraction, no retrieval/cancel writes, failed-save retention and retry, optional custom Source, full multiline pay persistence, initial history, reload, duplicate blocking/Open existing/Save separately, distinct-posting handling, missing-company validation, expired/unsupported fallback and unchanged manual creation. The preview was inspected in dark/light themes and at 390px/1280px; the mobile document stayed exactly 390px wide and salary tiers retained their line breaks. Cancel remained available during a pending retrieval. A native Chrome confirmation was needed to complete Open existing after the automation's dialog API stalled; the editor opened the original UUID and history unchanged.

Live smoke checks used five public GETs: one board lookup, two actual Greenhouse postings through the production pipeline, one unavailable posting and one posting through the actual Deno HTTP entry. Both current postings supplied company/title/plain-text descriptions; the unavailable URL returned the expected error. The Deno entry returned anonymous 401 and synthetic-Auth 200 with exact CORS and no-store headers. These checks did not authenticate to or mutate hosted Supabase.

The extra HTTP smoke initially reached an existing Python static server on port 8000 (501), and an alternate loopback address timed out. The exported fetch entry was then run with the documented `deno serve --host=127.0.0.1 --port=8778` form on an isolated port; the check passed. No listener or certificate protection was disabled. See [Deno HTTP entry configuration](https://docs.deno.com/runtime/reference/cli/serve/).

## Limits and next review

- Only the two approved global hosted Greenhouse domains and documented individual API are implemented. Custom employer URLs and regional hosts need deliberate identity/allowlist decisions.
- No AI or broad DOM inference fills missing compensation, employment type or work arrangement. Compensation may exist only in description text; review it manually. Remote geographic eligibility remains readable location/description text.
- Provider and requisition metadata is not persisted. Canonical URLs support same-posting matching; custom aliases and repostings can evade it. Same-title postings with distinct known IDs are kept separate. Missing-location same-company/title matches are review candidates, not proof of duplication.
- Client checks cannot prevent simultaneous-tab duplicates without database uniqueness. No automatic merge is available. Existing UUIDs and revisions are untouched.
- Preview drafts are in memory only. The function supplies current public facts, not a historical snapshot; expired postings cannot be recovered.
- Hosted deployment, gateway JWT verification, exact Pages CORS and authenticated acceptance still need dogfooding. No live credentials, records or schema were changed during this implementation.

Before Ashby/Lever, retain per-field provenance and provider-specific date/pay semantics. Greenhouse confirmed that a returned posting URL can be a custom domain, pay intervals are unspecified, and employer metadata is not standardized; these must not silently become normalized facts. No broader architecture or schema change is justified by this slice. Review and dogfood Greenhouse first.
