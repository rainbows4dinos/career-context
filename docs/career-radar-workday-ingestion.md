# Career Radar: limited Workday ingestion

Implemented October 7, 2026, following the approved compatibility spike. Local validation is complete; hosted deployment/acceptance will be recorded below after verification. No database migration, generated type change, new dependency, browser setting, résumé change or Worker change is required.

## Supported links and identity

Use **Add prospect → Retrieve posting** with a public Workday detail link, then review the existing editable preview and explicitly save or cancel.

- `https://<tenant>.wd<cluster>.myworkdayjobs.com/[locale/]<site>/job/[location/]<posting-anchor>`
- `https://wd<cluster>.myworkdaysite.com/[locale/]recruiting/<tenant>/<site>/job/[location/]<posting-anchor>`

The cluster allowlist is **1, 3, 5 and 103**, exercised in the spike; multi-digit clusters are supported without allowing untested environments. Extend this list only after a public detail smoke check. Tenant/site/anchor tokens are validated. The complete anchor, including meaningful suffixes such as `-1`, is retained; its case-insensitive comparison identity is distinct from the CXS requisition ID. Locale, location and tracking variants match the same host/tenant/site/anchor. Different hosts, clusters, sites or repost anchors remain distinct; cross-host aliases are not assumed equivalent.

Canonical saved links omit locale, fragments, `utm_*`, `source` and `sourceid`; preserve the validated location segment and unknown query parameters. No input query is forwarded upstream. Board listings, `/details/` routes, application routes, custom employer domains, implementation/internal host variants and unknown clusters receive the existing manual-entry fallback.

## Retrieval and extraction

The adapter constructs `https://<validated-host>/wday/cxs/<tenant>/<site>/job/[location/]<complete-anchor>` internally. It GETs the public CXS detail response, validates its exact `jobPostingId`, `jobPostingSiteId` and any supplied hosted `externalUrl`, then optionally GETs the fixed public detail page. No upstream link is followed. The optional inert JSON-LD must match one exact CXS requisition and normalized title; any supplied URL must match the same posting identity.

| Field | Rule |
| --- | --- |
| Company | Explicit CXS or matched JSON-LD `hiringOrganization.name`; preserve legal entity names and warn for review. Conflicting names leave Company blank. Never manufacture a brand from the tenant or strip a legal prefix. |
| Title | Explicit CXS title |
| Location | All supplied primary/additional locations, country and matched geographic eligibility; preserve multiple locations |
| Work arrangement | Explicit recognized CXS `remoteType` or matched `TELECOMMUTE`; conflicts leave it blank with a warning. Remote-looking location names alone do not set it. Unknown `Flex` is not guessed. |
| Employment | Preserve CXS `timeType` verbatim; `Full time` does not mean permanent |
| Description | Complete CXS HTML converted to inert text with paragraphs/lists; no scripts/resources |
| Posted date | Valid matched `datePosted`, checked against any CXS `startDate`. Conflicts/relative dates stay blank. This is current publication, not an inferred original posting date. |
| Compensation | Complete explicit structured salary tiers, currency and interval; otherwise narrowly bounded labeled pay sections with all supplied tiers/qualifiers. Ambiguous sections and unlabeled prose leave it blank. No annualization. |
| Requisition | CXS `jobReqId` in preview metadata; never substituted for the full posting identity |

Discovered date remains first capture in Radar (UTC), editable. Source remains the optional discovery channel. Applied date, status, assessments and connections are not inferred. Missing required company/title must be completed before Save.

For pay prose, only explicit Salary/Pay/Compensation Range headings and safe known section boundaries are supported. Examples outside this conservative shape remain available in the complete description for manual review; blank Compensation does not assert that the posting has no pay information.

## Errors and security

Workday 403 is **inaccessible**, not proof of expiration. 404/410 or explicit `posted=false` is **unavailable**. Malformed/mismatched detail JSON, retrieval failures, redirects and throttling remain distinct typed errors. Optional metadata failure retains CXS facts with a warning; exhausting the shared deadline aborts the operation. `canApply=false` warns but never changes Radar status.

The existing function still verifies Supabase Auth, restricts the configured owner, enforces exact-origin CORS and keeps gateway JWT verification enabled. Only internally constructed HTTPS destinations on validated hosted identities are requested. Credentials, custom ports, traversal/encoded separators, IPs, hostile subdomains and unknown hosts are rejected. Redirects are not followed; no cookies or Radar credentials go to Workday.

Existing bounds remain: 4 KiB inbound body, 2,048-character URL, 1 MiB streamed upstream response, 32 KiB Auth response, 15-second overall deadline, and at most two Workday GETs. JSON-LD collection is inert and bounded. Retrieval never writes to the database, creates history, archives bodies or modifies existing prospects. Distributed rate limiting is still deferred; add it before automated discovery/broader traffic.

## Files and validation

New modules: `tools/career-radar/ingestion/workday-url.js` (URL identity) and `workday.js` (CXS validation, matching, extraction and bounded retrieval). Shared dispatch, preview provider/method variants and UI support text add Workday. The JSON-LD collector is reused with Workday-specific matching; existing Ashby/Lever matching is unchanged. Existing duplicate comparison, preview, create path, revision guards and status trigger remain authoritative.

New synthetic fixtures and coverage live in `tools/career-radar/tests/fixtures/workday/` and `tests/workday-ingestion.test.js`. Existing SDK/migration-backed persistence and Deno handler suites also cover Workday. No live posting bodies or personal job-search records were committed as fixtures.

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

Local results: **79 Node tests and 5 Deno tests pass**, both typechecks/linters and vendor verification pass. Coverage includes both hosted families, clusters/locale/location aliases, shared-host routing, posting/requisition separation, repost suffixes, legal companies, remote conflicts, complete geography, pay present/missing/tiers, malformed/inaccessible/unavailable responses, unsafe URLs, redirects, size/deadline boundaries and conservative duplicates. Existing Greenhouse, Ashby, Lever, manual/data/RLS/revision/history regressions pass. Save tests use the actual SDK and migration-backed PostgreSQL fixture, retaining UUID across retries and producing one normal trigger event.

Local Chrome acceptance uses the disposable fixture server:

```sh
node tests/fixtures/radar-server.js
```

Sign in with the printed synthetic credentials. The full Workday fixture is `https://example.wd5.myworkdayjobs.com/en-US/External_Careers/job/Example-City/Senior-Product-Designer_REQ-123-1`; remove locale/location to test duplicate aliases. Anchors ending `REQ-999`, `REQ-404`, `REQ-403` exercise partial facts, unavailable and inaccessible outcomes. Retrieval/edit/Cancel left zero rows/events; a failed Save preserved the edited preview, retry created one prospect/event and reload restored both.

Limited native-fetch smoke checks succeeded for public NVIDIA, McKesson and Penn postings. These exercised tenant/shared families, legal names, missing unlabeled pay, a real remote conflict and an explicit hourly pay section. They do not guarantee all tenants or Supabase egress behavior; hosted acceptance is separate.

## Deployment and hosted acceptance

Reuse existing `RADAR_PUBLISHABLE_KEY`, `RADAR_OWNER_ID`, `RADAR_ALLOWED_ORIGINS`; no credential/origin change is needed. Commit, then redeploy the function before publishing the browser's expanded support:

```sh
supabase functions deploy job-ingest --project-ref liwszkldtfxihoyipbai --use-api
git push origin main
```

Keep `verify_jwt = true`; never use `--no-verify-jwt`. The existing Pages workflow publishes the static changes and generates browser-safe config. See [initial server setup](career-radar-greenhouse-ingestion.md#deploy-and-configure) for configuration details.

Hosted checks must use the real signed-in account: retrieve real hosted links, review/edit, Cancel with no writes, partial/error behavior and existing-provider/manual regressions. Avoid disposable production prospects; Save/retry/history/reload and distinct-identity duplicate cases are covered locally. Keep read-only before/after record snapshots outside this public repository. Record actual hosted results rather than treating local tests as production acceptance.

## Limitations and follow-up

CXS is an observed public interface, not a documented integration contract with guaranteed compatibility. Access can differ by tenant or egress region. No authenticated employer access, CAPTCHA handling, browser automation, generic scraping, custom domains, AI, discovery or schema changes were added. Optional JSON-LD absence leaves publication and other unsupported facts blank. Salary extraction is deliberately conservative. Manual Add still bypasses ingestion duplicate review; concurrent tabs can still create duplicates. Broader cluster coverage and durable rate limiting require separate review.
