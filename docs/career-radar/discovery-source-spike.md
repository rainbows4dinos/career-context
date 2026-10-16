# Cross-company discovery source feasibility — #27

Research date and source access date: **2026-10-15**. Research only; no integration, application changes, schema, dependencies, account creation, subscriptions, or paid calls.

Context: [#27](https://github.com/rainbows4dinos/nextchapter/issues/27), [#4](https://github.com/rainbows4dinos/nextchapter/issues/4), [#25](https://github.com/rainbows4dinos/nextchapter/issues/25), and [product plan](product.md). The attached spike brief supplies the research scope; the current issues also define later integration acceptance. This report addresses feasibility only. Earlier local profile/UI work was preserved.

## Executive summary

**Try Himalayas first for a bounded, private, remote-first validation experiment. Prefer its structured JSON API for an eventual adapter, subject to account and permission validation.** It offers cross-company discovery, useful remote eligibility filters, and clearer API-specific caching conditions than the other candidates. Its public MCP interface produced relevant role titles across many companies in this spike. This validates a discovery surface, not the JSON API, completeness, employer availability, or implementation readiness. See [Himalayas API](https://himalayas.app/api), [API terms §113](https://himalayas.app/terms), and the live evidence below.

**Conditional fallback: Adzuna**, particularly for Portland/West Coast opportunities beyond remote-only inventory. Resolve its third-party-contact restriction and ongoing-use licence before testing employer verification or integrating it. No credentials or account approval were validated. [Adzuna API terms](https://developer.adzuna.com/docs/terms_of_service)

No provider is yet cleared for the full persisted, assessed, employer-verified workflow. Do not start integration or automatically proceed to #25. Cross-company discovery is demonstrably possible; sustainable permission, structured access, and authoritative verification remain gates. An ATS-only implementation would not satisfy #4.

## Provider comparison

Confidence distinguishes documented capabilities from tested access and coverage. “Conditional” means a candidate for validation, not vendor approval. Detailed source links and unresolved rights follow the table.

| Provider | Access and cost | Search | Data quality | Original-posting verification | Storage / redisplay | Limitation and confidence |
| --- | --- | --- | --- | --- | --- | --- |
| **Himalayas** | Free JSON API advertises account/key; public MCP anonymous | Remote, country, keywords; seniority/type; JSON timezone; richer MCP filters | Structured JSON documented; live MCP rendered text omits key provenance fields | Sample exposed provider link only; required Apply link must remain | API permits caching with expiry removal and attribution; redistribution scope needs clarification | Remote-only; conditional primary. High confidence in sampled MCP access, medium in JSON/rights fit |
| **Adzuna** | Registered ID/key; default quotas; ongoing licence may be needed | Broad country/keyword/location/type/pay/category | Snippets; provider ID; explicit predicted-salary flag | Redirects, not guaranteed employer URLs; contact clause unresolved | Attributed display allowed; persistent history/AI/retention unclear | Conditional fallback; medium documentation confidence, no live/account validation |
| **The Muse** | Registration wording conflicts with testing allowance; published hourly quotas | Category, level, location, company; coarse for precise titles | Jobs/company resources; exact payload completeness unvalidated | No guaranteed employer URL; do not scrape Muse pages | Display/link-back licence; no cloning or service replication | Weak precise-query fit; medium docs, low operational confidence |
| **Jooble** | Country-specific registration/key; **500 requests lifetime** free | Keywords, location/radius, salary; paginated | Snippet, ID, company, type, updated, Jooble link | Provider link; resolution/retrieval permission unconfirmed | Website display marketed; durable/AI rights unconfirmed | Finite free quota; medium docs, no live validation |
| **Remotive** | Anonymous free API; conservative daily request guidance | Remote feed; documented title/description search | HTML, ID, salary text, job type, publication time | Provider URL; no original application field documented | Attribution/link-back; signup and syndication restrictions | Two queries returned identical irrelevant sets; no-go as primary on this evidence |
| **Brave Search** | Account/key/card; $5/1,000 Search calls; $5 monthly credit | Cross-web queries, country/freshness, operators | URLs/snippets; no job schema or stable posting ID | May find originals; publisher permission remains separate | Default terms prohibit durable result storage | Later exploratory option with appropriate contract; not default MVP persistence source |

## Access, rights, coverage and data findings

### Himalayas — recommended validation candidate

The current API page specifies a free server-side key, 120 requests/minute and 25,000/day per account. JSON search has keyword/country/worldwide, seniority, employment type, company slug, timezone and sorting; search uses numbered pages. The browse feed uses cursors, at most 20 records/request. Refresh is described as daily. Remote coverage is worldwide with country restrictions; there is no documented city filter. [API documentation](https://himalayas.app/api)

JSON fields include company/title, country/timezone restrictions, employment type, full HTML plus excerpt, salary bounds/currency/period, publication/expiry dates, applicationLink and guid. Staff/Principal are not distinct seniority enums: retain title matching. Employer sectors need contextual evidence; job categories are not proof of a company's business. Salary fields lack an explicit stated-versus-estimated provenance flag in the reviewed schema; verify against the original before calling them employer-stated. [OpenAPI schema](https://himalayas.app/docs/openapi.json), [data dictionary](https://himalayas.app/docs/data-dictionary)

API §113 expressly allows personal/commercial integrations, requires attribution and the supplied applicationLink for every Apply action, encourages caching, and requires expired-job removal. It also prohibits redistribution to other boards/aggregators/search engines. The API page promotes internal dashboards and board backfill: our interpretation is that a private personal dashboard is promising, but confirm Radar's persisted feed/Tracker handoff falls within that scope. Ask about retained IDs, decisions and derived assessments after expiry or termination, third-party LLM processing, and independent employer verification. Do not replace the required Apply link with a resolved ATS link. [Terms](https://himalayas.app/terms)

AI-agent use and public anonymous MCP search are explicitly documented; that is stronger evidence for inference use than silence, but does not settle indefinite assessment storage or model training rights. The live MCP returned text rather than the structured result shape described in its documentation. Use it as research evidence, not a drop-in normalized data contract. [MCP reference](https://himalayas.app/docs/remote-jobs-mcp), [AI-agent documentation](https://himalayas.app/docs/ai-agents)

**Access discrepancy:** the current API page requires a key, whereas older AI-agent docs/README describe anonymous JSON access; OpenAPI security includes both bearer and anonymous alternatives. No JSON calls were made to guess which applies. Treat keyed JSON access and issued-key quotas as unvalidated. Public MCP access was actually tested. [API](https://himalayas.app/api), [official examples](https://github.com/Himalayas-App/remote-jobs-api), [OpenAPI](https://himalayas.app/docs/openapi.json)

### Adzuna — broad-market fallback, gated by terms

Registration supplies app_id/app_key. The documented search specification covers 19 country codes including US, title-only/phrase/AND/OR/exclusions, location/radius, category/company, employment flags, salary with unknown-pay inclusion, age and sorting. Remote and seniority lack dedicated filters in that specification; keywords require local confirmation. Category is not a rich employer-industry taxonomy. Numbered pages and results_per_page are supported; the reviewed specification gives no maximum page size or total accessible window. [Overview](https://developer.adzuna.com/overview), [search specification](https://developer.adzuna.com/swagger/spec/test2.json)

Results provide company/title/location, ID, created timestamp, optional salary/type/time, category and redirect_url. Descriptions are explicitly snippets. Preserve salary_is_predicted: predicted pay must never become stated compensation. A created timestamp is provider evidence, not proof of employer publication or availability. [Search examples](https://developer.adzuna.com/docs/search)

Terms list personal research and attributed listing publication as permitted uses; defaults are 25/minute, 250/day, 1,000/week and 2,500/month. Other organizational use has a 14-day validation trial and may require a licence; an ongoing Radar price is not published/validated. Displayed ads require linked Adzuna attribution at least 116×23px; estimates have separate attribution. Termination requires removal of acquired data from website pages. Cache duration, durable private history, third-party AI assessment and deletion of derived records need clarification. Most critically, terms prohibit contacting third-party content providers and require directing queries through Adzuna. Ask Adzuna whether redirect resolution and subsequent employer/ATS retrieval are allowed; do not interpret this away as merely an anti-sales rule. [API terms](https://developer.adzuna.com/docs/terms_of_service)

### The Muse — documented API, weak precise discovery fit

Documentation allows unregistered testing at 500 requests/hour, versus 3,600/hour with an app key; API terms §2.2 require registration to access. This conflict prevented an anonymous test. Registration, approval and ongoing charges were not validated; no paid tariff was found in these pages. Jobs use 20-result pages and page_count, category, level, company and location, including flexible/remote. Company search adds industry/size. A precise title/keyword, salary or employment-type job filter is not documented. International location options do not establish useful US/Portland inventory or freshness guarantees. [API documentation](https://www.themuse.com/developers/api/v2)

The reviewed page exposes jobs and individual-job/company endpoints, but its dynamic examples did not supply a payload during this research. Company, title, location, pay, employment type, full-text versus excerpt, publication date, original URL and external-ID completeness all need a registered response audit; do not promise missing fields or infer them from the website.

The API licence permits formatting/display in apps with Muse links, but prohibits cloning content, replicating its products/services and scraping the site. Assess private caching, retained decision history, downstream LLM assessment, commercial applicability and source-link resolution with the provider. No explicit assessment/retention permission was established. Termination requires removing/destroying licensed copies. Do not scrape Muse landing pages to find hidden employer links. [API terms §§3, 4, 13](https://www.themuse.com/developers/api/v2/terms)

### Jooble — legitimate search API, finite free validation runway

The August 2026 guide specifies a country-specific account/key and **500 total lifetime requests**, not a monthly allowance. US keys serve US listings; other countries need separate keys. Search accepts keywords, location/radius, salary, page and ResultOnPage; companysearch targets company names. Remote, seniority, employment-type and sector filtering are not dedicated request parameters in that guide. Page size/depth ceilings and rate limits remain unconfirmed. Responses contain company/title/location, ID, snippet, salary text, employment type, source, Jooble link and updated timestamp; updated is not employer-posted date. Salary provenance/normalization and field completeness need testing. [REST guide](https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation)

Its portal explicitly invites displaying search results on another website. That is not an unlimited storage, redisplay or AI licence. General site terms restrict copying/automated access; clarify API-specific precedence, attribution, cache TTL, deletion, original-link resolution, LLM use and ongoing quota/price in writing. No negotiated price or account was validated. Preserve the Jooble link rather than silently bypassing it. [API portal](https://jooble.org/api/about), [general terms](https://jooble.org/info/terms)

### Remotive — usable test endpoint, unsuccessful design search sample

Anonymous JSON access is documented. Guidance advises at most four requests/day and blocks excessive traffic above twice/minute. The remote-only feed documents category/company and title/description substring search, limit but no pagination cursor/offset, newest-first publication ordering, ID, company/title, geographic restriction text, optional type/salary text, full HTML, provider URL and publication date. Structured seniority, salary, employment and industry search are absent; local eligibility checks are necessary. [Official API README](https://github.com/remotive-com/remote-jobs-api)

Public results are delayed 24 hours. Attribution and Remotive links are mandatory; submission to third-party boards and signup/email collection to expose listings are restricted. An existing private login is not automatically equivalent to collecting signups, but the private authenticated Radar presentation needs confirmation. Durable caching/history, third-party assessment and expiry/deletion rights are unresolved. A private API is offered without a current web-page price; the live response contains legacy pricing language, not a verified current quote. [API conditions](https://remotive.com/remote-jobs/api)

Its general terms discuss third-party AI integrations, but that does not grant arbitrary integrations all rights. Optional salary text has no estimate flag; preserve it as provider-reported until verified. The bounded test below failed relevant-query behavior; do not select this free endpoint as the main source without explanation/retest. [General terms, AI integrations §2e](https://support.remotive.com/en/article/terms-of-service-u4kbkf/)

### Brave Search — permitted web search, persistence is a blocker

Search pricing is $5/1,000 requests with $5 recurring monthly credits; activation requires a card and key. Eight searches would be $0.04 before credits. This was not tested and no card/account was supplied. Storage-enabled/custom pricing is unresolved. [Pricing](https://brave.com/search/api/), [account/credit FAQ](https://api-dashboard.search.brave.com/documentation/resources/help-feedback)

Keyword/site queries, country/language, freshness and numbered offsets could discover employers without a watchlist. Job seniority, US remote eligibility, type, salary and sector are textual evidence, not structured filters. Results are titles/URLs/snippets, with optional page metadata; employer/company identity, job IDs, pay and posted date require permitted original retrieval. Web count is at most 20 and offset at most 9; not an exhaustive job corpus. Index/page recency is not vacancy freshness. [Web Search reference](https://api-dashboard.search.brave.com/api-reference/web/search/get)

Default terms prohibit durable storage/database creation from results beyond transient operation, derivative works and model-improvement uses. AI-oriented marketing does not resolve these restrictions for saved assessments. Attribution is optional under the general terms, with prescribed branding if used. A suitable storage/AI agreement and publisher rights are prerequisites; search access grants no rights to fetched third-party pages. This is a later exploratory layer under #4, not a default persisted MVP source. [Terms §3 and attribution](https://api-dashboard.search.brave.com/documentation/resources/terms-of-service), [copyright/storage FAQ](https://brave.com/search/api/)

## Bounded live validation actually performed

Budget declared before testing: **at most 10 unauthenticated job/API requests, at most four permitted posting checks, maximum spend $0**. Documentation/issue reads are separate. Actual traffic: **10 API HTTP requests**, no employer/posting-page checks, no retries, no accounts/keys purchased or created. Each result read was bounded by timeout/response size. Only generic role/country strings were sent; no private profile, feedback or watchlist was read or transmitted. Raw responses and scratch analysis remain outside this repository in a guarded private directory under `/private/tmp/`; only aggregate findings appear here.

### Remotive: two GET requests

- `https://remotive.com/api/remote-jobs?search=product%20designer&limit=100`
- `https://remotive.com/api/remote-jobs?search=design%20lead&limit=50`

Both returned HTTP 200 and the same 14 IDs across eight companies. Neither set had a product-design/design-lead title; none of the returned descriptions contained either literal query phrase. Within each set: zero duplicate IDs and zero repeated normalized company/title/location tuples. Between queries: 100% ID overlap. Seven of 14 salary fields were empty; other inspected fields were populated. Three provider publication dates were within seven calendar days and eleven within 8–30 days of the research date. This says nothing about employer availability. An occupational inconsistency also appeared: a title containing “Contractor” was typed full_time.

**Conclusion:** transport works, relevant-query semantics did not in this sample. Do not mistake eight companies or recent provider dates for eight relevant employers. Cache, endpoint behavior or inventory may explain it; no cause was proven. No relevant original posting was selected for verification.

### Himalayas: eight public MCP requests

Three protocol requests (`initialize`, initialized notification, `tools/list`), four `search_jobs` calls and one `get_job_details`, all through documented `https://mcp.himalayas.app/mcp`. Read-only public tools only; no account/profile/tracker/employer tools. Each search used `country: United States`, `page: 1`, no company restriction; remote is inherent to the source. [Public MCP access/reference](https://himalayas.app/docs/remote-jobs-mcp)

| Keyword | Provider-reported matches | Returned rows | Companies | Literal target-title matches* | Numeric pay shown |
| --- | ---: | ---: | ---: | ---: | ---: |
| Staff Product Designer | 73 | 20 | 19 | 17 | 17 |
| Principal Product Designer | 49 | 20 | 20 | 10 | 14 |
| Senior Product Designer Portland | 0 | 0 | 0 | 0 | 0 |
| Product Design Lead | 387 | 20 | 19 | 16 | 11 |

*Conservative title-string check, case-insensitive: Staff/Principal Product Designer; Product Design Lead or Lead Product Designer. It is not qualification fit, hands-on scope, salary provenance, geographic eligibility or active-posting verification. Other titles may still be relevant. Totals are provider claims; only page one was inspected.

The 60 returned rows covered **55 distinct company names**, with **60 unique provider job URLs** after removing query strings: zero duplicate URL occurrences across these pages. This is observed sample diversity, not full-corpus recall or a cross-source dedupe test. No watchlist was supplied/read, so “outside the user's watchlist” was not independently checked. No city filter was available: the zero Portland keyword result does not prove absence of Portland-eligible remote work. Contract-specific coverage and consumer/healthcare/wellness representation were not validated.

All 60 were rendered MCP text with title/company/location/type and provider links, but no explicit stable ID, posting/expiry date or full description field. Forty-two displayed numeric pay; eighteen did not. Source freshness could not be measured from these search responses. The one detail call returned a substantial description, but its links were only to Himalayas; it did not establish an original employer URL or active employer posting. Documentation promises a richer structured shape than this observed transport. No JSON API access, persistence, pagination completeness, 429 behavior or deletion flow was tested.

### Other providers

Adzuna and Jooble require credentials/account access; none was sought. Muse documentation's anonymous-test allowance conflicts with its registration terms, so no live call was made. Brave needs account/key/card. None is live-validated by this spike, and ordinary web-search research is not a substitute for testing its commercial API.

## Original-posting verification decision

**None of the sampled leads is employer-verified.** A provider's active flag, expiry date, publication time, HTTP 200 or search inclusion is insufficient. Provider URLs, required Apply links, independently established employer URLs and canonical identity must remain separate.

| Source | Technical path | Permission / status |
| --- | --- | --- |
| Himalayas | Structured API may expose applicationLink; MCP sample only provider link | Retain mandated Apply link. Confirm independent resolution/retrieval and whether an additional employer evidence link is allowed; not tested |
| Adzuna | redirect_url, potentially intermediate boards | Contact clause blocks assumptions; obtain interpretation before following chains to retrieve content |
| Muse | Individual-job API first; original link not established | No Muse-page scraping; obtain allowed resolution route |
| Jooble | Jooble link/source, original destination unknown | Obtain API-specific resolution rights; no automated site extraction |
| Remotive | Remotive listing URL, no original field documented | Provider link-back stays; original retrieval rights/route unestablished |
| Brave | Search may return direct employer/ATS URLs | API licence does not license publisher content; verify each supported route separately |

Any future permitted check must bound and validate redirects, forbid private/network-unsafe destinations and credentials, preserve attribution, and use existing supported employer/ATS retrieval identities. Do not broaden outbound allowlists implicitly. Distinguish verified open, explicitly closed, unavailable/error and unsupported/unverified; a timeout or missing result must never close a role. Independently sourced employer facts have separate provenance/rights and cannot automatically launder restricted provider content into permanent records.

## Recommended MVP source and smallest next experiment

**Primary: Himalayas JSON API, conditional on the gates below. Fallback: Adzuna, conditional on its own written permissions and account-level validation.** Himalayas best fits remote-first exploration and exposes stronger structured eligibility data. It will not replace broad Portland/local-market discovery; keep that gap explicit. Adzuna is the more plausible complementary broad-market candidate, but not an automatic fallback if its verification restriction remains unresolved. Jooble's finite free allowance is a weaker sustainable default; Muse needs coarse browsing and registration clarification; Remotive failed this sample; Brave needs special persistence rights.

Before executing the next experiment:

1. Obtain confirmation for Radar's single-owner private feed, Supabase caching, retained decisions/IDs, explicit Tracker handoff, third-party LLM inference and derived-assessment storage. Resolve expiry/deletion obligations and independent original-posting verification without replacing required application links. No provider contact was made in this spike.
2. Confirm free JSON account/key availability and actual quota, which authentication documentation applies, search page size/depth, freshness guarantees and salary provenance. Keep credentials outside the repository/browser. Do not sign up for a paid service.
3. Confirm at least one permitted path from a returned lead to an authoritative employer/ATS posting. If permission or source access fails, stop that candidate and record the blocker; do not substitute restricted scraping.

**Proposed separate test budget:** at most **20 free JSON API requests over two days**, at most **8 permitted outbound HTTP requests across four original postings** including redirects, **$0 spend**, one operator, no AI calls. Four role queries × two pages = eight calls; two broadened Senior Product Designer/US queries address the failed Portland string; four repeat searches on day two and two detail calls bring the baseline to sixteen. The remaining four requests cover at most one bounded retry per failed operation. Stop at the cap or unexpected billing/authentication requirement.

Use the four role examples above with US eligibility; inspect West Coast/Portland and Pacific overlap from explicit evidence rather than pretending a keyword is a city filter. Add no watchlist/company restriction. Inspect contract and hands-on scope locally in the bounded sample; keep missing compensation eligible for review. Report sectors descriptively rather than excluding adjacent employers.

Proposed acceptance thresholds, established before that test (product judgments, not provider promises):

- At least 10 unique, title-relevant US-eligible leads from five companies; at least one company outside an operator-supplied comparison watchlist, compared locally without sending it to the provider.
- At least one Staff, Principal or hands-on Lead candidate; report Senior and contract coverage separately. Absence of contracts or Portland-local jobs is an explicit coverage gap, not evidence that none exist.
- At least 70% of inspected rows pass the declared role-title/eligibility screen; unknown scope and eligibility are counted separately, not silently accepted. Record duplicate rate before normalization and actual versus reported page counts.
- Four permission-cleared original checks attempted within budget, at least three verified active with matching employer/title and supported identity. Anything else stays unverified; if no permitted verification route exists, the source fails the full workflow gate despite useful leads.
- Full-text/ID/date/pay provenance audited, all mandatory provenance represented or explicitly unknown, attribution/Apply-link behavior reviewable, expiry/deletion and unchanged refresh demonstrated. Repeat-day absence cannot prove closure.

If these fail, revise the source/product decision explicitly. This spike authorizes neither that future integration nor #25 implementation.

## Implications for #25 — capabilities and fields, not a schema

- **Separate capabilities:** keyword/title/category filtering; country versus city/radius/timezone; remote-only versus mixed inventory; seniority/contract/pay filters; search versus browse; structured versus text responses; detail availability; supported original retrieval. Capability absence is not a job fact. Staff/Principal/IC-versus-management need title/description evidence beyond coarse enums.
- **Identity and links:** source + source-scoped external ID when actually returned; provider detail/discovery URL, required application URL, original employer/ATS URL and cautious canonical identity separately. Preserve provider tracking/attribution where required. A slug-derived alias is not an observed guid; unknown IDs remain unknown.
- **Facts and evidence:** company/title, raw and normalized location/eligibility/timezone, type, description completeness, salary bounds/currency/period/raw text and stated/predicted/unknown origin. Preserve per-field source and conflicts. Provider enrichment and AI interpretation must not become employer facts. Sanitize upstream HTML.
- **Time and verification:** source publication/update/expiry versus first/last seen, retrieval attempt and last successful employer verification. Retain verified evidence across outages. Partial pages, ignored filters, rate limiting and changing totals must be representable without marking unseen jobs closed.
- **Execution:** per-source authentication/quotas, cursor/page limits, response-size/time budgets, result completeness, transient failures and sanitized diagnostics. Anonymous MCP success does not prove keyed JSON success; adapter identity includes transport/version. No AI in deterministic eligibility screening.
- **Rights as capabilities:** attribution text/link/display requirements, required Apply destination, allowed cache/retention/assessment uses, expiry/termination deletion and whether minimal decision/dedupe records can survive. Do not persist a raw payload merely because another source permits it. A no-storage licence is a source-selection blocker for this persisted workflow, not a reason to omit privacy/history requirements silently.
- **Ownership/boundaries:** Auth + RLS Supabase records, secrets server-side, minimal query disclosure. Radar observations remain separate from accepted Tracker prospects. Preserve multiple-source observations; only strong identity matches may alias. #9 owns suppression/resurfacing; #5 owns assessment and its permissions. No full schema is proposed here.

## Open questions and implementation readiness

| Gate | Remaining evidence |
| --- | --- |
| Sustainable access/cost | Himalayas JSON key and actual limits; Adzuna ongoing licence quote/use classification; Jooble post-500 price; Muse registration/pricing; Brave storage-enabled contract |
| Storage and AI | Exact cache/history/assessment retention, third-party LLM inference, training prohibition versus inference permission, expiry/termination deletion and Tracker handoff |
| Product classification | Whether Radar's private personalized feed is permitted under Himalayas/Remotive redistribution rules and Muse non-replication restriction |
| Authoritative verification | Allowed redirects, original-link access and independent ATS retrieval while retaining mandatory source Apply links; representative successful checks |
| Coverage and quality | Keyed JSON role relevance, Portland/West Coast eligibility, contract supply, consumer/health/wellness diversity, full-text completeness, stated-pay provenance, stable IDs and actual posting freshness |
| Robustness | Page limits, ignored filters, 429/outages, idempotent refresh and rights-aware expiry/deletion |

**Decision: ready to pursue a constrained Himalayas validation experiment after permission/access questions are answered; not ready to begin a provider integration or claim #27's integration criteria are met.** The source/capability findings can inform planning for #25, but no #25 implementation is authorized or started. Costs incurred here: **$0**. The only new repository artifact is this report.

Document validation: local links, required sections and `git diff --check` passed. Primary-document URLs returned HTTP 200 in the direct link check except Jooble's API portal, which returned 403 to that client despite being readable through the web research reader. This is an access limitation, not proof that its authenticated API fails. The referenced GitHub issues were read through `gh`. No application tests were needed for this documentation-only addition.

## Primary sources

All links below were accessed **2026-10-15**. Prices, limits, inventory and terms are time-sensitive; recheck before account activation/integration. No third-party API directory was treated as authority. Live sample claims above are our bounded observations, not claims from documentation.

- **Himalayas:** [API, quotas and conditions](https://himalayas.app/api); [OpenAPI](https://himalayas.app/docs/openapi.json); [data dictionary](https://himalayas.app/docs/data-dictionary); [API terms §113](https://himalayas.app/terms); [MCP reference](https://himalayas.app/docs/remote-jobs-mcp); [MCP access/attribution](https://himalayas.app/mcp); [AI-agent guide](https://himalayas.app/docs/ai-agents); [official JSON examples](https://github.com/Himalayas-App/remote-jobs-api).
- **Adzuna:** [overview/authentication](https://developer.adzuna.com/overview); [search/examples](https://developer.adzuna.com/docs/search); [search specification](https://developer.adzuna.com/swagger/spec/test2.json); [terms/quotas/attribution](https://developer.adzuna.com/docs/terms_of_service).
- **The Muse:** [API documentation](https://www.themuse.com/developers/api/v2); [API terms](https://www.themuse.com/developers/api/v2/terms). The latter page says last modified 2015; its age does not establish that restrictions are waived.
- **Jooble:** [REST guide, modified 2026-08-16](https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation); [API portal](https://jooble.org/api/about); [general terms](https://jooble.org/info/terms).
- **Remotive:** [API conditions](https://remotive.com/remote-jobs/api); [official README](https://github.com/remotive-com/remote-jobs-api); [general terms, updated March 2026](https://support.remotive.com/en/article/terms-of-service-u4kbkf/).
- **Brave:** [pricing/storage FAQ](https://brave.com/search/api/); [activation/credits FAQ](https://api-dashboard.search.brave.com/documentation/resources/help-feedback); [Web Search reference](https://api-dashboard.search.brave.com/api-reference/web/search/get); [terms](https://api-dashboard.search.brave.com/documentation/resources/terms-of-service).
