# Workable ingestion compatibility spike

Date: October 14, 2026. Status: research complete. The user subsequently authorized implementation; see [the implementation guide](prospect-tracker-workable-ingestion.md) for current support, validation and deployment status. The proposals below record the original spike.

## Recommendation

Proceed with a limited Workable adapter when implementation is authorized. Use the public posting-detail and account-metadata endpoints observed in Workable's own careers client. Two public employers passed a read-only proof of concept using existing ingestion helpers. No employer token, new database schema, dependency or browser automation appears necessary.

Start with account-qualified URLs such as `https://apply.workable.com/{account}/j/{shortcode}/`. Defer accountless short links, legacy employer subdomains and custom domains. The principal tradeoff is reliance on observed public client endpoints rather than a documented detail-API contract. This is a similar compatibility risk to the existing limited Workday adapter.

## Documented interfaces versus observed behavior

[Workable's careers API guide](https://help.workable.com/hc/en-us/articles/115012771647-Using-the-Workable-API-to-create-a-careers-page) documents a public published-jobs feed at `https://www.workable.com/api/accounts/{account}?details=true`. It also describes an employer-authenticated API. The [SPI job-detail reference](https://workable.readme.io/reference/jobsshortcode) requires an employer token with `r_jobs`; that interface is unsuitable for importing unrelated employers' public postings.

Native HTTP probes observed the following. These observations are not a vendor stability guarantee:

| Interface | Result | Implication |
| --- | --- | --- |
| Documented public feed on `www.workable.com` | 302 to `https://apply.workable.com/api/v1/widget/accounts/{account}?details=true` | The current shared fetch helper correctly rejects it as a redirect. Do not enable generic redirect following. |
| Direct widget feed on `apply.workable.com` | 200 JSON for both sampled employers; employer name and jobs with descriptions | Viable alternative, but retrieves the whole board and offers less explicit workplace detail. |
| `GET /api/v2/accounts/{account}/jobs/{shortcode}` | 200 JSON for both sampled postings without credentials | Preferred targeted retrieval; bounded independently of board size. |
| `GET /api/v1/accounts/{account}?full=true` | 200 JSON with `name`, `subdomain`, `uid` | Employer metadata can be checked against the posting's `accountUid`. |
| `GET /j/{shortcode}` | 301 to an account-qualified path for the sampled short link | Supporting this input requires an explicit resolver, not the existing redirect policy. |
| Account-qualified detail HTML | 200 small HTML shells; no JSON-LD found by inert script inspection in either sample | An HTML/JSON-LD-only adapter did not provide sufficient evidence for a preview. |
| Invalid shortcode / valid shortcode under the wrong account | Detail API returned 404 for both | Account and shortcode must both match; never search other accounts or pick a similar title. |
| Invalid hosted detail URL | 302 to the account board with `not_found=true` | A redirect to a board is not a valid posting or an instruction to crawl it. |

Endpoint templates were identified by reading, not executing, the JavaScript bundle referenced by the hosted pages: [Workable careers client observed during this spike](https://dcvxs6ggqztsa.cloudfront.net/candidate/releases/careers.6901cd820c44d775.js). That versioned URL is evidence, not a production dependency to fetch at runtime.

## Live compatibility evidence

The samples below were chosen for compatibility testing, not as saved opportunities or recommendations. Requests used native Node fetch, no cookies, no authorization headers, no redirected fetches and no database access. Response bodies were processed in memory and not archived.

| Sample | Detail bytes | Account bytes | Direct widget feed | Observations |
| --- | ---: | ---: | --- | --- |
| [Workable](https://apply.workable.com/careers/j/94F9E30E22/) | 5,781 | 1,801 | 11,504 bytes / 2 jobs | Hybrid workplace despite `remote: false`; description, requirements and benefits supplied separately. |
| [Hugging Face](https://apply.workable.com/huggingface/j/81B46579FE/) | 6,018 | 1,227 | 37,522 bytes / 6 jobs | Explicit remote workplace; description and requirements supplied, benefits empty. |

The temporary proof used existing `retrievePosting()`, `descriptionText()` and `normalizePatch()`. Each sample completed exactly two ATS GETs within a 15-second deadline with the default 1 MiB per-response limit and `redirect: 'manual'`. Assertions checked exact shortcode, `state: published`, `isInternal: false`, account subdomain and matching account UUIDs. Normalized descriptions retained every nonempty section: 4,890 and 5,054 characters respectively. Both resulting draft shapes passed the existing model validator. No adapter was added to the application and no prospect/history writes occurred.

Exploratory probes also fetched feeds, HTML shells and the public client asset. Those discovery requests are not part of the proposed runtime adapter. The proposed production operation is bounded to two ATS requests.

## Proposed first-version contract

### URL and identity

- Accept HTTPS on the exact host `apply.workable.com` only, with bounded account and shortcode tokens and exact `/{account}/j/{shortcode}` paths; accept optional trailing slash and the matching `/apply` suffix as aliases for the detail URL. The latter is a proposed input convenience, not an application-form retrieval requirement.
- Reject credentials, explicit nondefault ports, backslashes, traversal/encoded separators, listing/search routes and arbitrary additional path segments. Use the existing 2,048-character input bound. Bound ASCII account tokens to 100 characters and alphanumeric shortcodes to 64; preserve token case until case-alias behavior is established. These bounds are proposed compatibility limits, not vendor format guarantees.
- Identity is provider `workable` + account + shortcode. Validate the exact returned shortcode and the account metadata's subdomain/UUID binding. A different account, conflicting shortcode or mismatched UUID fails closed.
- Canonicalize accepted aliases to the account-qualified detail path. Strip `utm_*` tracking parameters and fragments; preserve unknown query parameters in the recorded URL, forwarding none upstream. Use the same canonical rule on client and server.
- Construct the two API destinations from validated tokens. Do not follow response URL fields, HTML links, remote JSON-LD contexts or `Location` headers.
- Reject `/j/{shortcode}` and `/j/{shortcode}/apply` initially with guidance to open the link and copy the resolved account-qualified address. This keeps the current client/server identity contract intact.

Supporting accountless inputs later would require a narrowly bounded same-host resolver and a review of `decodePreview()`, which currently derives the entire expected identity synchronously from the original URL. Do not assume that shortcodes are globally unique or introduce a placeholder account that weakens duplicate checks. Account-qualified alias handling needs synthetic tests before claiming support.

### Retrieval and field mapping

Fetch the job first. Require valid JSON, the expected shortcode, published state and a noninternal posting. Missing or unrecognized availability fields should fail closed until their meaning is tested. Then request account metadata. A valid but conflicting account identity is a hard failure. A transport/size/unavailable failure of optional metadata may retain job facts with Company blank and an explicit warning; cancellation or deadline exhaustion still aborts the operation. Never infer an employer's display name from its slug or the page title.

| Tracker field | Proposed evidence and treatment |
| --- | --- |
| Company | Account `name`, after subdomain/UUID checks. Missing employer remains editable and required before Save. |
| Title | Job `title`; no generated title or use of employer-defined `code` as identity. |
| Job URL | Canonical account-qualified detail URL. |
| Description | Convert each nonempty `description`, `requirements`, `benefits` section with the existing inert parser, combine in that order with section labels, and retain complete text. Do not append a combined description a second time. |
| Location | Preserve all explicitly public locations and geographic eligibility. Exclude entries marked hidden; do not reduce remote roles to an office city. Test missing/ambiguous visibility fields before broad support. |
| Work arrangement | Prefer explicit `workplace` (`remote`, `hybrid`, `on_site` mapped to Tracker `onsite`). `remote: false` alone does not establish onsite. Conflicting evidence leaves the field blank with a warning. |
| Employment type | Map observed `type: full` to Full-time. Verify other raw codes before mapping them; leave unsupported values blank with a warning. |
| Compensation | No structured salary fields appeared in these two detail responses. Leave blank initially; retain any pay prose in the description. Do not borrow the authenticated SPI salary schema or infer currency/annual intervals. |
| Posted date | `published` was present, but original-versus-republication semantics were not established. Keep Posted date blank and show the supplied publication timestamp in a warning, following the conservative Ashby policy. Do not substitute creation/update/relative dates. |
| Discovered date | Existing capture-time UTC default, editable. |
| Source, status, notes, connections, assessments | Retain existing UI/data-layer ownership; provider retrieval must not populate them. |

Return the existing preview/draft/provenance/warnings envelope with a proposed method `workable-public-job-detail`. Keep the 4 KiB request bound, fixed 1 MiB per-response bounds, two-request ceiling, 15-second shared deadline, owner authentication and exact-origin CORS. Handle 404 as unavailable, 429 as retry-later, 401/403 as inaccessible and other redirects/errors as retrieval failures. Do not use a whole-board fallback, automatic retries, dynamic byte-limit increases or employer credentials.

## Implementation impact if approved

| Area | Work |
| --- | --- |
| Provider modules | Add scoped `ingestion/workable-url.js` and `workable.js`; reuse bounded retrieval, inert parsing, normalization and existing error types. |
| Recognition / dispatch / contract | Update `posting-url.js`, `pipeline.js`, `preview.js` provider and method variants. Preserve other provider identities. |
| Client validation and duplicates | Ensure `decodePreview()` rejects mismatched identities/provenance and duplicate matching treats scoped `/apply`, trailing slash and tracking aliases consistently. Distinct accounts/shortcodes must not merge by title. |
| UI | Add Workable to supported-provider copy and name map; reuse the existing editable preview, duplicate review, Cancel and Save paths. Include the short-link limitation in errors/help. |
| Tests | Add synthetic fixtures and scoped Node/Deno coverage; extend the disposable HTTP fixture for browser acceptance. No raw employer responses in the repository. |
| Deployment | Redeploy existing `job-ingest` before publishing frontend support through Pages; update matching asset revisions. Retain JWT verification and existing settings. No schema/type generation or new secrets expected. |

This is a moderate adapter addition, smaller than the Workday URL/cluster implementation but broader than adding a hostname. The unresolved compatibility work is endpoint stability, URL variants and sparse/conflicting field semantics. A time estimate should include synthetic tests and hosted acceptance, not only a successful HTTP request.

## Acceptance and remaining gaps

Before release, require:

1. Recognition tests for account-qualified paths, `/apply`, tracking aliases, distinct identities, malformed hosts/tokens, traversal and the explicit rejection of accountless/custom-domain links.
2. Adapter tests for all nonempty sections, missing Company, every public location, hidden locations, hybrid/remote conflicts, unknown employment codes, blank unsupported salary/dates and exact field provenance.
3. Boundary tests for unpublished/internal jobs, mismatched account UUID/shortcode, malformed JSON, 404/403/429, redirect rejection, advertised and streamed byte overruns, cancellation and one overall deadline. Optional account failures must not become silent identity conflicts.
4. Node and Deno checks plus existing-provider regression tests. Browser tests must cover editable preview, Cancel/no writes, failed-save draft retention, normal Save/history in the synthetic store and duplicate Open existing/Save separately behavior.
5. Authenticated hosted retrieval/preview/Cancel against at least these two public account families after deployment, plus existing-provider/manual-entry smoke checks. Do not create disposable production prospects. Keep any private record-comparison evidence outside this repository.

Not established by this spike: Supabase-region access, documented rate quotas, shortcode case equivalence, other account families, salary-bearing or multilocation edge cases, all employment codes, locale variations, closed-job lifecycle behavior beyond a synthetic invalid ID, and long-term endpoint stability. A 404 is not proof that a formerly published job expired. No load/rate-limit probing, employer authentication, submission, discovery or production acceptance was performed.

Validation for this research change: reviewed existing ingestion/identity/save boundaries; native read-only HTTP and scratch proof completed; local documentation links and `git diff --check` checked. Production code and hosted data remain unchanged.
