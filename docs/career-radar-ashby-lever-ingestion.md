# Career Radar: Ashby and Lever URL ingestion

Implemented locally October 7, 2026, extending the deployed Greenhouse slice. Ashby and Lever have **not been deployed or tested against hosted Radar**. This milestone changes no database schema, records, generated database types, browser configuration, dependency versions, résumé code or Worker. Review before deployment; Workday and discovery remain out of scope.

## Use and shared behavior

On **Add prospect**, paste a hosted Greenhouse, Ashby or Lever job URL and select **Retrieve posting**. The shared preview shows extracted facts, missing fields and warnings. Edit, then explicitly save or cancel. Company and title remain required. Manual entry still works without retrieval.

Source remains an optional discovery channel with suggestions and arbitrary text. ATS identity is ephemeral preview metadata. Discovered date defaults to the first capture date in Radar (UTC), remains editable, and can be supplied by a future pipeline caller. Applied date, status, assessment and connections are never inferred.

Duplicates retain **Open existing**, **Save separately** and **Cancel**. Known posting identity is provider + board/site + posting ID, plus Lever region. Query differences cannot evade this match. Distinct known identities within a provider are not merged on company/title alone. Records without recognizable URLs can be possible company/title/location candidates. Recheck before saving; no automatic merge or database uniqueness guarantee was added. The existing create path retains its UUID across retries; editing still uses the exact `updated_at` revision guard and history remains trigger-generated.

## Supported identities and retrieval

| Provider | Hosted input | Controlled outbound retrieval |
| --- | --- | --- |
| Ashby | `https://jobs.ashbyhq.com/<board>/<uuid>` and optional `/application` suffix | Public `api.ashbyhq.com/posting-api/job-board/<board>?includeCompensation=true`, selecting the exact posting, then its fixed hosted detail page for metadata |
| Lever global | `https://jobs.lever.co/<site>/<uuid>` and optional `/apply` suffix | Individual `api.lever.co/v0/postings/<site>/<uuid>?mode=json`, then its fixed hosted detail page |
| Lever EU | `https://jobs.eu.lever.co/<site>/<uuid>` and optional `/apply` suffix | Individual `api.eu.lever.co/v0/postings/<site>/<uuid>?mode=json`, then its fixed EU hosted detail page |

Board/site tokens allow letters, digits, underscores and hyphens. Posting IDs must be UUID-shaped; preserve board/site case and lowercase UUIDs. Remove fragments, application suffixes, `utm_*`, and the recognized provider tracking parameters. Preserve unknown query parameters on the saved URL. Queries are **never forwarded** to ATS APIs or hosted metadata retrieval. Global and EU Lever identities remain distinct.

The public API supplies posting facts but does not supply the employer display name in the interfaces inspected. Both new adapters therefore request one fixed ATS detail page and inertly parse only matching `JobPosting` JSON-LD. Match explicit posting identity/URL when present; otherwise require an exact normalized title and a single matching object on that individual page. Reject conflicting or ambiguous metadata. Company comes only from `hiringOrganization.name`, never the board slug. If metadata is absent, blocked, oversized or malformed, retain supported API facts and require manual company entry.

This is a bounded ATS metadata fallback, not generic scraping: no arbitrary employer URLs, broad DOM inference, scripts, remote contexts, canonical links or resource loads.

## Normalization differences

| Field | Ashby | Lever |
| --- | --- | --- |
| Posting selection | Exact ID or documented `jobUrl`; reject conflicting/multiple identities | Individual response ID and optional hosted URL must match site and region |
| Company | Explicit matched hosted employer metadata | Explicit matched hosted employer metadata |
| Description | HTML/plain posting description, preserving paragraphs and lists | Combined opening/body once, all requirement/benefit lists, and closing text; separate opening/body and plain-text fallbacks |
| Geography | Primary and secondary locations, including supplied postal geography | Primary/all locations and explicit country |
| Work arrangement | Explicit workplace type, or `isRemote=true`; conflicting facts leave it blank. `false` alone does not mean onsite | Explicit `remote`, `hybrid`, `on-site`; `unspecified` remains blank |
| Employment type | Map documented values to readable labels; retain explicit unknown wording | Explicit commitment wording |
| Compensation | Retain every supplied tier, location qualification, component and explicit interval; no selected preferred range or annualization | Explicit salary range/currency/interval plus salary description; do not infer missing intervals |
| Posted date | Always blank; `publishedAt` is last publication and is shown as a warning, including its supplied timestamp | Only a matched page's valid `datePosted`; never substitute `createdAt` |

Source references: [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api), [Lever public Postings API](https://github.com/lever/postings-api). The adapters return the existing partial-draft/provenance/warnings contract, with additive provider/method variants and optional Lever region. No breaking contract or schema change was necessary. Provider IDs are not persisted separately from the canonical job URL.

## Files and architecture

| Created modules | Responsibility |
| --- | --- |
| `tools/career-radar/ingestion/posting-url.js` | Shared recognition, canonicalization, provider-scoped identity comparison and fixed API destinations |
| `tools/career-radar/ingestion/preview.js`, `errors.js` | Shared JSDoc preview contract and typed errors |
| `tools/career-radar/ingestion/posting-facts.js` | Existing inert description parser, plain-text helpers and shared draft/provenance normalization |
| `tools/career-radar/ingestion/posting-metadata.js` | Bounded optional ATS-page JSON-LD extraction; no outbound metadata hints |
| `tools/career-radar/ingestion/ashby.js`, `lever.js` | Provider-specific retrieval, exact response validation and pure normalization |
| `tools/career-radar/ingestion/pipeline.js` | Provider dispatch independent of UI, Auth and database writes |
| `tools/career-radar/tests/ats-ingestion.test.js`, `tests/fixtures/ashby/`, `tests/fixtures/lever/` | Synthetic deterministic JSON/HTML and adapter/boundary tests |

Modified shared files: `ingestion/greenhouse-url.js`, `greenhouse.js`, `bounded-fetch.js`, `handler.js`, `ingestion-client.js`, `duplicate-match.js`, and `ingestion-ui.js`. Greenhouse's parser is shared without changing its output; existing exports remain compatible. The UI uses provider labels rather than retrieval branches. The same Edge Function calls the dispatcher; the existing application/data layer still owns persistence.

Validation changes: `supabase/functions/job-ingest/index.test.ts`, `tools/career-radar/tests/ingestion-persistence.test.js`, `tests/fixtures/radar-server.js`, and the scoped package's function-test fixture read paths. No new packages, import maps, lock changes or frontend build are needed. Repository instructions, overview, v0 guide and ingestion plan link to this implementation.

## Security and limits

The existing verified Supabase Auth, configured single-owner restriction, exact-origin CORS and enabled gateway JWT verification remain unchanged. Only the public key is used; no service-role credential or privileged database client is introduced. Radar's bearer token goes only to Supabase Auth, never job sites.

- HTTPS, validated tokens and hardcoded ATS hosts/path templates. No IP/private-network targets, arbitrary hosts or upstream destination following.
- Redirects are rejected, including optional metadata redirects. Only GET with an Accept header goes to ATS hosts.
- At most **two ATS requests**, plus the existing Auth verification, per new-provider operation. Greenhouse still uses one ATS request.
- Existing **4 KiB** request body, **2,048-character** URL, **1 MiB per upstream response**, **32 KiB** Auth response and **15-second overall** deadline remain. Streamed limits reject oversized bodies rather than truncating them. Metadata shares the same deadline; deadline exhaustion aborts retrieval.
- Metadata parsing caps JSON-LD script blocks, nesting and inspected objects. All HTML is inert and converted to plain text; the browser renders text only.
- Retrieval performs no database requests/writes. No raw archive, cache, cookies, secret forwarding or application logging of bodies/tokens was added. JSON responses remain `no-store`.

Distributed rate limiting remains deliberately deferred. Add it before discovery or broader use increases traffic; authentication and bounds are not a durable quota.

## Validation and acceptance

From `tools/career-radar/`:

```sh
npm run typecheck
npm run lint
npm test
npm run functions:typecheck
npm run functions:lint
npm run test:functions
npm run vendor:check
```

October 7 results: **68 Node tests and 4 Deno tests pass**, plus both typechecks/linters and the SDK vendor check. All existing Greenhouse tests remain in the suite. New tests cover provider URLs/regions, tracking and unknown queries, exact selection, employer metadata, pay present/missing/multiple tiers, geography/workplace, descriptions, missing facts, malformed responses, unavailable/throttled/failed retrieval, hostile URLs/content, redirects, size/deadline bounds, identity conflicts, conservative duplicates and browser response validation.

The persistence tests use the actual SDK and migration-backed PGlite with RLS/triggers. Each new provider's retrieval/discard writes nothing, failed create retains its input, and retained-UUID retry creates one prospect and one normal initial event. The Deno tests independently exercise Auth-before-outbound handling for all providers.

Local Chrome acceptance used the real app and SDK against the disposable fixture, never hosted Supabase. Verified both new providers' editable previews, Cancel without writes, Save/initial history/reload, partial-company validation, optional free-text Source, Ashby failed-save retention/retry, Lever EU recognition, duplicate review/blocking and explicit separate save. Greenhouse retrieval/Cancel/Save/history/reload and normal manual creation still work. Existing duplicate target UUIDs/history remain intact when opened from the board. The new-provider **Open existing link's draft-discard confirmation could not be completed through browser automation**, which stalled; this specific action remains a hosted dogfooding check. The existing confirmation/guard was preserved, not bypassed or changed.

To reproduce local browser checks:

```sh
node tests/fixtures/radar-server.js
```

Use the printed local URL and synthetic `radar@example.invalid` / `fixture-only-password`. The new full fixtures are Ashby `https://jobs.ashbyhq.com/example/11111111-aaaa-4111-8111-111111111111` and Lever `https://jobs.lever.co/example/22222222-bbbb-4222-8222-222222222222`; replacing the Lever host with `jobs.eu.lever.co` exercises EU. For either provider, ID `33333333-cccc-4333-8333-333333333333` supplies partial facts without company. IDs ending `000000000404` simulate unavailable postings. The existing Greenhouse fixture URLs and loopback count/failure controls remain available. Stop the server to discard all synthetic data.

Two public live pipeline smoke checks passed without database writes: an Ashby Monarch Money posting (explicit employer/remote/pay/description; last-publication warning and blank Posted date) and a global Lever demo posting (explicit employer/location/workplace/pay interval, complete description and matched publication date). Tests do not depend on these pages and no live bodies were archived. EU was covered deterministically, not against a live EU posting. These checks are not hosted Edge Function/Pages acceptance.

## Deployment after review

No new environment variables, secrets, schema migrations or generated database types are required. Retain the three already-configured server settings: `RADAR_PUBLISHABLE_KEY`, `RADAR_OWNER_ID`, `RADAR_ALLOWED_ORIGINS`. Browser settings and Pages workflow are unchanged.

After reviewing and committing this milestone, redeploy the existing function from the repository root with the authenticated Supabase CLI:

```sh
supabase functions deploy job-ingest --project-ref liwszkldtfxihoyipbai --use-api
```

Keep `verify_jwt = true` and the checked-in Deno configuration; do not use `--no-verify-jwt`. Existing server settings should remain provisioned; see [the original configuration guide](career-radar-greenhouse-ingestion.md#deploy-and-configure) if reconfiguration is necessary. Publish the reviewed static changes using the existing Pages workflow after the function update. Do not publish the expanded browser support before updating the handler.

Hosted acceptance remains required: real authenticated retrieval/edit/Cancel, one user-approved real save per provider, reload/history, duplicate Open existing/Save separately/Cancel, partial facts when available, Greenhouse and manual-entry regressions, and confirmation that pre-existing records remain unchanged. Keep private backups/acceptance artifacts outside the public repository. No deployment, commit or hosted prospect write was performed for this milestone.

## Limits and lessons before Workday

- Ashby returns the whole board. Large boards can exceed the response ceiling; fail to manual entry rather than silently truncate or increase limits automatically.
- Employer metadata is optional and hosted pages can be large. A blocked/oversized page retains API facts but leaves company blank; this is an expected partial-preview outcome.
- Only hosted URL shapes are supported. No custom employer domains, board listings, authenticated/private postings or headless retrieval.
- Ashby republication is not an original posting date. Lever publication depends on matched page metadata. Users may need to supply dates themselves.
- Pay text intentionally retains tiers and qualifications, sometimes repetitively, rather than flattening them into a guessed numeric salary. Remote eligibility stays readable geography/description text.
- Same-provider distinct IDs remain separate; cross-provider reposts can be possible candidates but never auto-merge. Client matching still cannot prevent concurrent-tab duplicates.
- Do not assume Workday has an equivalent supported public API. Validate representative tenant/site URL identities and structured data in a separate spike before adding destinations. Keep its date, employer and description semantics explicit; a missing structured-data response should fall back to manual entry, not widen the retrieval boundary or introduce headless browsing.

Stop here for review and hosted dogfooding. Workday is not implemented or authorized by this milestone.
