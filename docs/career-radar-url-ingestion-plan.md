# Career Radar: Job URL Ingestion Plan

Date: October 7, 2026

Status: Architecture approved by the user on October 7, 2026, with the decisions recorded below. Greenhouse was the first authorized slice; its deployment and authenticated hosted acceptance are recorded in [the Greenhouse guide](career-radar-greenhouse-ingestion.md). The user subsequently authorized Ashby and Lever using that reference architecture; their implementation, deployment and authenticated hosted validation are recorded in [the adapter guide](career-radar-ashby-lever-ingestion.md). The user subsequently approved limited Workday ingestion after its compatibility spike; see [implementation, limits and deployment status](career-radar-workday-ingestion.md). Generic employer retrieval and discovery remain future work.

## Goal and scope

The eventual workflow is:

Paste job URL → retrieve posting → extract structured facts → normalize into the existing prospect model → detect likely duplicates → show an editable preview → user explicitly saves or cancels.

The ingestion pipeline must also be reusable by future automated job discovery. It must not depend on the Add Prospect UI or perform automatic database writes.

No AI assessment, scoring, discovery, application automation, or generalized scraping platform is part of this milestone. No database changes are needed for the first implementation.

## Existing architecture

This proposal follows [AGENTS.md](../AGENTS.md). [Career Radar v0 documentation](career-radar-v0.md) remains the authority for current setup, schema, credentials, and validation; this document describes proposed work.

The architectural spike inspected `AGENTS.md`, `CLAUDE.md`, Radar's application/data layer and generated types, the migration, Supabase configuration, the existing Worker, and the Pages workflow.

- Radar is a static JavaScript application with hash routes, Supabase Auth, and a typed data layer.
- Supabase owns prospects and trigger-generated status history.
- Saves retain UUIDs across retries and use exact `updated_at` revision guards.
- GitHub Pages publishes the repository root and generates browser-safe configuration. It cannot perform server-side retrieval.
- The résumé Worker has an origin/shared-key gate rather than user authentication. Leave it unchanged.
- Existing repository career context remains canonical for career history, experience, preferences, and evidence. Ingestion extracts posting facts, not career-context updates.

## Recommended architecture

Use one authenticated Supabase Edge Function for retrieval, a reusable extraction/normalization pipeline, and an editable browser preview that saves through the existing data layer.

Implement Greenhouse first. Ashby and Lever are approved architectural targets, but are not authorized in this milestone. Workday remains best-effort future work. Generic retrieval is also deferred.

| Responsibility | Location |
| --- | --- |
| Authenticate, limit requests, retrieve public postings | One `job-ingest` Edge Function |
| Recognize URLs, extract facts, normalize drafts | Shared modules independent of UI and database writes |
| Compare against existing prospects | Pure duplicate matcher plus an owner-scoped data query |
| Edit preview, save, cancel | Existing static Radar application |
| Persist approved prospect | Existing `createProspect()` flow |

A separate Cloudflare Worker is viable, but would require another authenticated endpoint and deployment configuration. Supabase already supplies Radar's identity boundary. Its documented function flow supports signed-in calls through `supabase.functions.invoke()` and user-scoped authentication. See [Supabase function authentication](https://supabase.com/docs/guides/functions/auth).

Keep this within the existing `#/prospects/new` route, with a URL-entry/preview state. The route does not own the pipeline. No frontend framework or Pages build step is needed; deploy the Edge Function separately.

## Ingestion data flow

1. **Paste URL.** Validate syntax locally and retain the original input.
2. **Retrieve.** The browser invokes `job-ingest` with its current user session. The function authenticates before making outbound requests.
3. **Extract and normalize.** Return a partial prospect draft, posting identity, field provenance, and warnings.
4. **Check duplicates.** Compare against all accessible prospect identities, independently of the board's ten-card preview.
5. **Review.** Show editable fields, missing required information, retrieval warnings, and duplicate candidates.
6. **Explicit save or cancel.** Save uses the existing database path. Cancel performs no database write.

The ingestion endpoint itself must never create or update prospects. A successful save produces only the existing trigger-generated history behavior; retrieval and preview produce no status events.

## ATS-specific retrieval

| Platform | Retrieval and identity strategy |
| --- | --- |
| Greenhouse | Recognize hosted board URLs and extract board token plus posting ID. Retrieve the individual posting through the public Job Board API, requesting pay-transparency information when available. It exposes company, title, description, location, first-publication date, and requisition information. Keep posting ID distinct from requisition/internal-job IDs. |
| Ashby | Extract board name and posting identity from the hosted URL. Retrieve the public board response and select the exact matching posting; request compensation information. Bound the response size because this endpoint returns a board's postings. Its `publishedAt` means last published, so do not silently label it the original posting date. |
| Lever | Extract site, posting ID, and global/EU region. Retrieve the individual posting through its documented API. Include description sections, requirement lists, and closing text rather than importing only the opening paragraph. Use explicit workplace and compensation fields when present. |
| Workday | Recognize supported hosted URL shapes and preserve tenant/site identity. Initially try structured data from the public detail page. If representative sites expose usable CXS JSON, add a narrowly tested adapter for those shapes. The spike did not establish a supported public CXS contract comparable to the other three APIs; do not promise universal Workday support. |

Provider references: [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), [Ashby Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api), and [Lever Postings API](https://github.com/lever/postings-api).

For Ashby and Lever, a board slug is useful identity information but not sufficient evidence of the company's display name. Obtain the name from explicit posting/page metadata where available; otherwise require the user to complete it.

## Generic fallback

Generic retrieval should first look for `JobPosting` JSON-LD, including objects inside arrays or `@graph`. Match the object to the requested posting; multiple unresolved postings should produce a warning or selection step.

This standard covers employer, title, description, location, employment type, salary, posting date, and identifiers. It also distinguishes remote arrangement from geographic eligibility. See [JobPosting structured data](https://developers.google.com/search/docs/appearance/structured-data/job-posting).

Avoid broad DOM scraping initially. When structured data is absent, return the URL and any clearly supported facts, then offer manual completion or pasted description text. Do not add browser automation, CAPTCHA solving, or authenticated-site retrieval.

Accept arbitrary pasted URLs as input, but initially retrieve only supported ATS hosts and explicitly approved employer hosts. Unsupported URLs receive a manual fallback. Unrestricted arbitrary-host fetching is a separate security decision, not implicit in the URL input control.

## URL canonicalization and posting identity

Keep two concepts separate:

- **Retrieval URL:** the exact, validated destination used to obtain content.
- **Canonical job URL:** the public posting link saved on the prospect.

For known providers, reconstruct canonical posting URLs from validated identities. Remove recognized tracking parameters and application-form suffixes only through provider-specific rules. Preserve unknown query parameters on generic URLs because they may identify the role.

Use provider-scoped identity: provider + tenant/board + region where applicable + posting ID. A requisition ID alone is not globally unique and can describe multiple postings. Treat page-supplied canonical links as untrusted hints, not destinations to follow automatically.

## Preview contract and normalization

The normalized result should contain:

- A partial draft containing only existing prospect fields.
- Original, retrieved, and proposed canonical URLs.
- Provider, tenant, posting ID, and requisition ID when supported.
- Retrieval timestamp and extraction method.
- Field-source information and explicit warnings.

This is a preview contract, separate from a database row. Missing company/title can be represented there even though both are required before saving.

| Prospect fields | Normalization rule |
| --- | --- |
| `company`, `title` | Explicit source facts; require completion before saving if missing |
| `job_url` | Validated canonical public posting URL |
| `source` | Discovery channel supplied by the caller/user; keep ATS provider separately in preview metadata |
| `location` | Preserve supported locations and geographic restrictions as readable text |
| `work_arrangement` | Map explicit statements to existing values; otherwise null. A city does not prove onsite work |
| `employment_type` | Preserve or consistently map explicit provider values |
| `compensation_text` | Preserve currency, interval, location tiers, and qualifications; do not annualize or select a preferred range |
| `job_description` | Convert HTML to plain text while retaining paragraphs and lists |
| `posted_on` | Use a supported posting date. Distinguish original publication from republication |
| `discovered_on` | User-controlled unless explicitly defined as the date first captured in Radar |
| `applied_on` | Leave null; ingestion does not imply application |
| Status, assessments, connections | New save defaults to `prospect`; leave assessment and connections untouched |

Reuse `normalizePatch()` for approved fields. Do not pass the entire ingestion response into a database insert. Missing or ambiguous facts remain null/omitted or require explicit user review; do not invent them.

### Schema recommendation and limitations

There is no immediate need for persistent provider-ID columns: canonical hosted URLs usually retain the posting identity. The limitation is weaker matching across custom employer URLs and aliases. Revisit durable identity fields when that becomes a demonstrated automation requirement, rather than placing machine-readable identifiers inside notes now.

Do not introduce ingestion tables, raw-page archives, or database migrations for this first slice.

## Duplicate detection

Match conservatively:

- **Strong candidate:** identical canonical URL or identical provider-scoped posting identity.
- **Possible candidate:** exact normalized company and title, supported by location or other distinguishing information.
- **Ambiguous:** multiple candidates, different posting IDs, or conflicting evidence.

Normalize whitespace, Unicode, and case for comparison. Preserve seniority, department, location, and meaningful title differences. Do not aggressively remove company suffixes or fuzzy-match separate roles.

Show candidates with reasons and their existing status/application information. Initially offer open existing, cancel, or an explicit decision to save separately. Avoid automatic merges.

Recheck immediately before saving. Preserve the retained create UUID for retries. Without a database uniqueness constraint, two simultaneous tabs can still create the same posting under different UUIDs. This is an explicit single-user limitation; client-side matching cannot guarantee uniqueness.

Existing records must retain their permanent UUIDs and revision guards. Opening an existing prospect continues through the current editor and guarded data layer.

## Security boundaries

- **Actual user authentication:** keep platform JWT verification enabled and verify the user in the handler. A publishable key or allowed Origin alone is insufficient. Restrict access to the intended Radar account.
- **Constrained retrieval:** initially fetch supported ATS hosts and explicitly approved employer hosts. Construct ATS API destinations internally.
- **SSRF protection:** HTTPS only; reject credentials, IP literals, unusual ports, and local/private destinations. Disable automatic redirects and validate each permitted hop.
- **No DNS-check shortcut:** resolving a hostname and then performing an independent fetch leaves a rebinding window. Unrestricted arbitrary-host retrieval needs enforceable outbound-network protection or address pinning. An allowlist is the smaller initial boundary. See [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).
- **Bounded work:** small request bodies, an overall deadline, capped redirects/outbound calls, and streamed response-size enforcement. Reject oversized responses rather than silently truncating descriptions.
- **Untrusted content:** use an inert HTML parser; never execute scripts, load embedded resources, resolve remote JSON-LD contexts, or render upstream HTML in the browser.
- **Credential isolation:** never forward Radar's JWT, cookies, or API keys to job sites. No service-role key is needed for ingestion or saving.
- **Rate limiting, deferred by user decision:** no Redis/Upstash or other external counter in the single-owner Greenhouse slice. Authentication and bounded work apply now; they are not distributed request quotas. Add durable distributed limiting before automated discovery increases traffic. See [Supabase rate limiting](https://supabase.com/docs/guides/functions/examples/rate-limiting).
- **Privacy:** return JSON with `Cache-Control: no-store`; avoid logging tokens, full posting bodies, or sensitive URL parameters.

The function's CORS allowlist should use the Pages origin, not the repository path, plus explicit localhost origins for development.

Function configuration and any rate-limit credentials belong in server-side environment/secret configuration. Browser configuration must continue to contain only approved public settings. Pages publishes the repository root, so source-code placement and Git ignores do not make credentials private.

## Error and fallback behavior

| Outcome | User-facing behavior |
| --- | --- |
| Unsupported host | Explain support boundary; offer manual entry with URL retained |
| Timeout, upstream throttling, temporary failure | Retry or manual completion |
| Removed/expired posting | Explain unavailability; never automatically set Radar status to `closed` |
| Partial extraction | Editable preview with missing fields and warnings |
| Conflicting structured data | Require review rather than silently selecting values |
| Retrieval blocked by security policy | Explain that the URL cannot be retrieved |
| Cancel | Discard preview; no prospect or history event |

## Proposed files and module responsibilities

These paths are proposed, not implemented.

| Files/modules | Responsibility |
| --- | --- |
| `supabase/functions/job-ingest/index.ts` | Thin authenticated HTTP entry point, CORS, limits, typed errors |
| `supabase/functions/job-ingest/deno.json` | Pinned server dependencies |
| `tools/career-radar/ingestion/` | Shared URL recognition, bounded retrieval, Greenhouse extraction, normalization, response contract and testable HTTP boundary; the function imports these scoped modules |
| `tools/career-radar/ingestion-client.js` | Invoke function and validate its response |
| `tools/career-radar/duplicate-match.js` | Pure identity comparison |
| `tools/career-radar/data.js` | Add a narrow, paginated identity query including `job_url` |
| `tools/career-radar/app.js`, `ui.js`, `view-model.js`, `styles.css` | URL input, loading/cancel states, editable preview, duplicate review, existing save flow |
| Tests and sanitized fixtures | Extraction, normalization, security, matching, and browser-flow coverage |
| `supabase/config.toml`, documentation, scoped tooling | Function configuration, deployment instructions, typecheck/test coverage |

Keep the retrieval/normalization pipeline independent of DOM, auth handlers, and database writes. The implemented shared modules live in Radar's scoped package so Node and Deno use the same sources and parser dependencies without another npm package. A future discovery process can call the same pipeline while supplying its own authenticated entry point and discovery source. Supabase also supports `_shared` between functions if later organization warrants it. See [Function organization](https://supabase.com/docs/guides/functions/development-tips).

The pipeline returns facts and warnings; callers own review and persistence. Future reuse does not authorize building discovery, scheduling, or privileged automation now.

## Proposed implementation milestones

1. **Contract and fixtures:** define URL identities, partial drafts, warnings, errors, and deterministic normalization.
2. **Secure retrieval foundation:** authenticated single-owner function, allowlisted destinations, bounded fetching, and deployment/package verification. Durable rate limiting is deferred.
3. **One complete Greenhouse slice:** paste → retrieve → duplicate review → editable preview → explicit save/cancel.
4. **Ashby and Lever adapters:** same contract and preview, with fixture coverage.
5. **Workday compatibility spike:** validate representative URLs before committing to a CXS adapter.
6. **Approved-domain generic fallback:** JSON-LD first; manual completion when extraction fails.

## Testing strategy

Use minimized, sanitized saved JSON/HTML fixtures as the main test inputs. Cover missing fields, escaped descriptions, multiple salary tiers, remote restrictions, republication dates, malformed JSON-LD, multiple postings, redirects, oversized responses, and expired jobs.

Add malicious URL/content fixtures and duplicate cases involving tracking URLs, same-title distinct postings, regional sites, and existing historical records. Do not commit private job-search records, backups, credentials, or personal source excerpts as fixtures.

Browser acceptance should verify that retrieval and cancellation write nothing, failed saves retain edits, retries retain UUIDs, and saving creates only the normal trigger-generated initial event. Existing revision and history behavior must remain unchanged.

Live ATS pages should be occasional smoke checks, not the basis of the test suite. Retain the existing scoped typecheck, lint, and tests; add coverage for the server entry point and shared modules without introducing a frontend framework.

## Approved decisions for the initial Greenhouse milestone

1. **Initial coverage:** Greenhouse only through the first complete vertical slice. Ashby/Lever are future targets; no Workday or generic employer retrieval now.
2. **Retrieval boundary:** global hosted Greenhouse identities and internally constructed API destinations only; no unrestricted fetching or extra employer allowlist.
3. **Rate limits:** no external counter now. Apply authentication, single-owner authorization, size limits, deadlines and bounded outbound requests. Distributed limiting remains future work before discovery increases traffic.
4. **Field semantics:** optional, editable `source` is the discovery channel with common suggestions and arbitrary text. Provider identity is preview metadata. Manual URL ingestion uses the first capture date in Radar for `discovered_on`; do not infer personal encounter dates. The caller can supply a discovery date to shared normalization later.
5. **Duplicates:** conservative candidates with Open existing / Save separately / Cancel, no automatic merge. Recheck before existing create-path persistence.

Greenhouse is implemented, deployed and authenticated hosted acceptance is recorded in its guide. The decisions above describe that initial milestone.

### Subsequent Ashby/Lever authorization

The user approved the next two provider adapters with the same authentication, review/save flow, source/discovery semantics and bounded allowlist. These are implemented, deployed and validated locally and with authenticated hosted acceptance. Review and dogfood before Workday. Ashby uses its public board API plus exact hosted employer metadata, keeps all compensation tiers/geography, and warns about last publication without filling `posted_on`. Lever supports global/EU individual APIs plus exact hosted employer metadata and complete description sections. The shared preview contract adds provider/method variants and optional Lever region without a breaking shape change. See [implementation details and limits](career-radar-ashby-lever-ingestion.md).

No Workday, generic arbitrary-host retrieval, discovery, AI, automatic merge or schema change is authorized or implemented by this extension.

Raw-page archives, ingestion tables, queues, headless browsing, automatic merges, and discovery scheduling can wait. The first durable milestone is a secure URL-to-preview flow using the current prospect model and existing save behavior.

## Workday extension — October 7, 2026

After the compatibility spike, the user approved a limited adapter for validated Workday hosted URL families and clusters (1, 3, 5, 103). CXS detail is primary; matching inert JSON-LD is optional. Preserve full posting anchors separately from requisitions, legal names and geographic restrictions; conflicting arrangement/date facts and ambiguous pay remain blank for review. A 403 is inaccessible, not automatically expired. The existing bounded authenticated function, preview, conservative duplicate review and explicit persistence remain authoritative. See [the Workday guide](career-radar-workday-ingestion.md) for validation and hosted status. No generic retrieval, database change, discovery or AI was added. The earlier milestone decisions above describe their original scope.
