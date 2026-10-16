# Discovery and verification foundation — #25

Implemented and corrected locally on October 15, 2026. **Disabled by default, not deployed or live-tested.** The user's later implementation and remediation requests supersede [#25](https://github.com/rainbows4dinos/nextchapter/issues/25)'s earlier contract-only wording. The [two #27 experiments](ai-web-research-spike.md) remain historical evidence; no additional paid request or issue change was made here.

## Flow and boundaries

**Find Opportunities → Review promising leads → Accept or Pass.** This foundation supplies the server contract; the later [#6 implementation](opportunity-feed.md) supplies the UI/client. Accept means interest, not applying or creating a Tracker record.

The owner-only `research-opportunities` function authenticates the Supabase user, loads the reviewed `career_profiles` row with that user's JWT and a public key through existing RLS, and checks the submitted revision. No service-role key, inferred signals, canonical career documents or full private history are used. Research preferences come exclusively from the reviewed explicit factors, compensation settings and optional focus. Factor importance is preserved. Common email/phone patterns are removed; free text still needs user review for unnecessary personal information.

One bounded OpenAI Responses request discovers zero to five provisional leads. The server validates structure, safe URLs and completed trace sources, suppresses supplied decisions/retained duplicates, and independently checks supported originals. Unsupported hosts remain reviewable and uncertain without being fetched. Missing/closed originals are rejected. A rejected candidate never reserves an identity or wildcard slot; among surviving duplicates the first retained candidate wins. This deliberately avoids extra calls to rank duplicate evidence.

Before returning, a fresh bounded profile read confirms both revision and reviewed timestamp. Mismatch or inability to recheck discards the new cards. No endpoint stores runs, decisions or opportunities. Durable history, suppression/resurfacing and Tracker integration remain later scope; no tables or migrations were added.

## HTTP input

Use the user's Bearer token and existing public Supabase key. The browser cannot supply the profile summary, provider or model configuration.

```json
{
  "profile_revision": 1,
  "decisions": [{
    "decision": "pass",
    "original_url": "https://job-boards.greenhouse.io/example/jobs/123",
    "company": "Example",
    "job_title": "Lead Product Designer"
  }],
  "focus": "Consumer wellness products"
}
```

`decisions` is required; `[]` explicitly means no supplied history. At most 100 identities are validated and used for deterministic suppression. A minimal subset of at most 20 identities and 6,000 serialized characters also enters the model prompt as exclusions; no decision reasons or raw history are transmitted. Model exclusion is advisory. Known posting/URL identity takes priority; exact normalized company/title is the fallback when a decision lacks a URL. Distinct known postings with the same title remain distinct. Every returned card has a `decision_identity` compatible with this input, using the original URL or, if absent, its discovery URL. The identity contains no decision value; #6 must add `decision` from the actual explicit user choice.

Reviewed factors must each fit 1,200 characters and their serialized summary 8,000 characters. Oversized constraints fail preflight rather than being truncated. Focus is optional, at most 500 characters, and cannot contain email/URL patterns. Input is bounded to 128 KiB.

## Results and the #6 trust contract

See [types.ts](../../tools/prospect-tracker/research/types.ts). Each run includes identifier/time, profile revision, provider/model, completion status, elapsed time, minimal relevant tool-action references, usage, unconfirmed cost estimate, safe `error_code`, notes and filtering counts. Raw reasoning, search queries, full source corpus, provider errors and full job descriptions are not returned.

Each card separates:

- `facts`: **only independently retrieved structured posting fields**. Company/title, location and compensation stay null when absent. No substring comparison of model value against model evidence occurs. A source's work arrangement is reported separately as `verification.work_arrangement`; it never establishes geographic remote eligibility, so unsupported `facts.remote_eligibility` remains null.
- `claims`: AI-reported company/title, location, remote eligibility and pay, explicitly unverified even when accompanied by evidence. Company/title remain usable as labeled review-card claims if independent facts are unknown. Contradictory AI evidence never promotes a claim into a fact. Unknown-compensation exclusion requires independent compensation, not claimed pay.
- `evidence`: short source-linked support with `ai_discovery` or `independent_check` origin. Source membership proves attribution, not semantic support. Independent entries link the original posting; `verification.source_urls` records the actual bounded request destinations and `field_sources` explains the ingestion fields. Upstream excerpts/descriptions are not retained.
- `assessment`: AI fit, concerns and wildcard rationale. Whole narrative items mentioning verification, source/page consultation, availability or application status are conservatively removed server-side, including such claims inside AI evidence. This can omit useful mixed fit/status prose; it does not repair or endorse remaining AI interpretation. A conflicting independent company/title clears fit rationale for reassessment. All model content remains untrusted plain text.
- `decision_identity`: roundtrippable original/discovery identity, independent of whether company/title facts are known.
- `verification`: server-observed availability/reason/time, application evidence, limited source requests/field labels and adapter warnings. These explain verification; model prose does not.

`verification.consultation` refers **only to the AI trace**: an exact completed original `open_page` gives `original_page_consulted`; otherwise usable trace gives `search_only`, and absent trace gives `unknown`. Failed opens, other jobs, source membership and `find_in_page` never qualify. Independent ingestion does not rewrite the AI's consultation history.

`completed` means the returned response/candidate processing finished, including valid zero-result runs and runs containing uncertain leads. Rejection or uncertainty alone does not make a run partial. `partial` means actual incomplete provider processing or a verification deadline; completed cards are preserved. `failed` means no usable research output or failed final profile safety check. #6 must preserve previous reviewed results on partial/failed runs, present partial cards separately, and avoid replacing good cards with an error. This endpoint has no stored results to overwrite.

Run codes are `provider_failure`, `timeout`, `invalid_structured_output`, `missing_search`, `profile_mismatch`, or null. HTTP preflight separately returns controlled configuration/auth/origin/input/profile/busy errors. No error includes provider bodies, secrets, profile values or stack traces. Costs are estimates, never invoice-confirmed spend or enforced ceilings.

## Independent checks: before and after remediation

Previously, verification used one static HTML request and title/company/text heuristics to infer availability. That missed JavaScript-heavy missing pages and could promote model claims into facts.

Now verification calls the existing [ingestPosting()](../../tools/prospect-tracker/ingestion/pipeline.js) entry point for Greenhouse, Ashby, Lever, account-qualified Workable and the already-supported Workday routes/clusters. It validates the exact posting identity and retrieves structured public posting data. Definitive `unavailable` errors, including an absent Ashby board entry or Workday `posted:false`, reject the lead. Inconclusive errors stay uncertain. Structured successful retrieval with a title means `appears_available`, not guaranteed hiring, eligibility or a functioning application route. Missing company, pay and location stay unknown; provider warnings are retained, including Workday's possible `canApply:false` warning.

The reuse checkpoint found no database/UI writes, application submission, auth bypass, private credentials, extra services, dependencies or migrations. The adapters construct fixed provider endpoints from validated identities. Existing ingestion files and behavior were not changed. Research adds a maximum of three credential-free manual GETs per candidate: at most two existing adapter requests and one inert original-HTML observation, all sharing a four-second deadline. HTML can contradict availability with a soft 404/closure or establish application evidence; **it cannot create an available status or structured facts**. When the structured endpoint is inconclusive, a static closure can still reject the original. When structured data succeeds but HTML is a JavaScript shell, the structured posting remains evidence and the form stays unestablished.

Only existing vetted platform hosts/routes are fetched. Model query parameters are discarded; recognized Greenhouse embed parameters are reconstructed. Redirects are never followed. A safe observed original-page Location may be returned as `redirect_url`, not fetched as a replacement. Arbitrary employer links, IP literals, private/local names, credentials, non-HTTPS URLs, custom ports and deceptive host suffixes are never check destinations. Display links use a separate HTTPS lexical policy; they are not automatically fetched or certified safe through DNS inspection.

The HTML parser executes no scripts and loads no frames, styles, images or external metadata contexts. Blocked/unreadable/oversized/error responses do not imply closure. Inert page text may still be misleading; server checks are observations, not guarantees. Unsupported Workday clusters (including the #27 wd503 URL) and arbitrary employer domains remain uncertain; there is no new browser rendering or host access.

Application evidence distinguishes `control_visible`, `form_observed` and `not_established`. A plausible form requires an identity-matching page plus applicant-facing email and résumé file fields; hidden, disabled, aria-disabled and hidden-container/disabled-fieldset inputs cannot establish it. A link is not a form, and a form is not tested submission. Only observed safe href/action URLs are recorded. No forms are submitted. Static identity/form recognition remains conservative and can miss real forms.

## Limits and configuration

| Control | Bound |
| --- | --- |
| Paid requests | One Responses POST, no retries or follow-ups |
| Model/tools/output | `gpt-5.4-mini`, live web search, 6 built-in actions, 6,000 output tokens, low reasoning, `store:false` |
| Model deadline | 120 seconds including response reading |
| Results | At most five |
| Independent GETs | At most three per checked candidate / fifteen total; zero redirects/retries |
| Verification bytes | Existing 1 MiB adapter responses, Ashby board 4 MiB, selected Ashby job 1 MiB; additional HTML 256 KiB; at most 5.25 MiB per candidate / 26.25 MiB across five |
| Verification deadline | Four seconds per candidate including optional metadata and HTML |
| Overall deadline | 145 seconds: at most 140 seconds for auth/profile/research/checks, then a fresh final recheck capped at five seconds and remaining total time |
| Provider response | 1 MiB decoded streamed bound |
| Per-instance brake | One invocation in flight and sixty-second cooldown |

The per-instance brake is not a distributed quota. Multiple isolates/restarts can admit additional requests. Enforced project billing controls and owner authentication are prerequisites to enablement. Neither flags, token/action/time limits nor the $0.15 ordinary planning target are hard monetary ceilings. Disconnect/timeout does not prove billing stopped. No automatic retries occur.

Use existing `RADAR_OWNER_ID`, `RADAR_ALLOWED_ORIGINS`, `RADAR_PUBLISHABLE_KEY` and platform `SUPABASE_URL`, plus server-only `OPENAI_API_KEY`. Both `RADAR_RESEARCH_ENABLED=true` and `RADAR_RESEARCH_BILLING_CONFIRMED=true` are required; absent flags fail without a paid call. Billing confirmation is an operator acknowledgment. JWT verification remains enabled in [Supabase configuration](../../supabase/config.toml); Auth verifies the real nonanonymous configured owner. Profile reads use the owner's JWT/public key, never a privileged fallback. Hosted setup status remains in [profile setup](profile.md).

The unconfirmed usage estimate uses #27's documented token rates and observed search-action count; billing-unit reconciliation is still outstanding. Recheck rates, source rights and provider retention controls before separately authorized enablement. `store:false` does not mean zero provider retention.

## Remediation validation and remaining work

The offline suite covers all five adapter integrations, structured closed Ashby/Workday outcomes, JavaScript-only/blocked/unreadable/long closure/soft-404 pages, unsupported destinations, independent versus contradictory/paraphrased AI claims, missing company/pay, unknown-pay exclusion, exact trace provenance, false narrative claims, duplicate ordering, original/discovery decision round trips, hidden/disabled forms, partial provider output, verification deadline with fresh profile recheck, stale/unverifiable profile rejection, and zero results.

Committed-safe synthetic [Experiment 1](../../tools/prospect-tracker/tests/fixtures/research/experiment-1.json) and [Experiment 2](../../tools/prospect-tracker/tests/fixtures/research/experiment-2.json) fixtures reproduce the 4/5 and 3/4 unsupported consultation-flag patterns. They contain fictional identities and no source excerpts or private profile. Tests have no temporary capture dependency and no skipped capture checks. Historical raw #27 artifacts remain outside the repository; their earlier audits are preserved in the spike report.

Validation commands remain scoped: `npm test`, `npm run typecheck`, `npm run lint`, `npm run functions:typecheck`, `npm run functions:lint`, `npm run test:functions`. Final validation: **151 Node tests passed**, including **34 research tests**, and **6 Deno ingestion-function tests passed**. TypeScript, both Deno function checks, ESLint, Deno lint, relative links, new-file whitespace and `git diff --check` passed. Existing persistence tests needed local loopback access; all passed with it. Both available historical #27 captures were also replayed offline with mocked missing-posting responses, confirming the 4/5 and 3/4 unsupported flags without live requests; these manual checks are not test dependencies or current availability checks. No dependencies were installed. Hosted packaging/Auth/RLS, live provider acceptance, billing reconciliation and recommendation quality are not established by offline tests.

#6 must consume the revised claims/facts/decision/status contract, render text safely with clickable labeled citations, retain prior cards on failures, and provide explicit Accept/Pass with no Tracker side effects. Decide durable decision persistence separately before adding storage. No architecture approval was needed for these corrections: they reuse existing code and infrastructure. No #6 UI, new adapter, migration, worker, crawler, deployment, paid request, billing change, commit or push occurred.

## Later #6 implementation — October 16, 2026

The subsequent user-approved [opportunity feed](opportunity-feed.md) now implements the UI and single-table persistence described there. Earlier statements that #6 or persistence were unstarted describe the foundation milestone. The research foundation itself is unchanged. Live discovery remains disabled, and the new migration has not been applied to hosted Supabase.
