# Career Radar product spec

Status: Living product plan; discovery and recommendation workflows are not implemented.
Updated: 2026-10-15
Parent: [#2 — Product overview and MVP](https://github.com/rainbows4dinos/nextchapter/issues/2)

## Goals

Productize the Consumer Design Watch workflow as a personalized opportunity feed informed by the user's strengths, interests, and practical constraints. Surface a small number of opportunities worth considering, mostly preferred roles with occasional explainable surprises. Improve relevance through decisions while keeping the user in control.

**Core loop:** Discover → Recommend → Add to Prospects or Pass → Learn.

This document captures cross-feature product intent. Linked issues hold feature requirements and acceptance criteria. Update both when a decision changes; resolve conflicts explicitly. Open decisions below are unresolved, not implementation instructions. Create implementation tasks only when a feature is ready to build.

## User experience

1. Review and edit a career profile before recommendations depend on it. Seed it from reviewed Consumer Design Watch learnings and canonical career context; do not blindly import chat memory.
2. Initiate discovery on demand from selected reliable sources: targeted company listings plus permitted cross-company search that can introduce companies outside a watchlist. Retrieve and verify original postings where supported before personalized assessment; incomplete leads retain explicit unknowns.
3. Review a focused feed. Each card shows company, role, location, compensation when stated, original posting/source link, freshness and verification context, a concise reason it surfaced, and concerns or unknowns. Clearly label strong matches and wildcards; make stale or unverified listings obvious.
4. **Add to Prospects** creates or reuses an appropriate Prospect Tracker record with available job details and source URL. Only intentionally accepted opportunities enter Tracker; preserve its existing status and history semantics.
5. **Pass** removes the item from the active feed and preserves its decision history. Feedback is optional: compensation, seniority/scope, management-heavy, company/industry, location/time zone, work type, already considered/applied, or other. Passing without a reason must remain quick.
6. Review history through lightweight New/Passed/All views or equivalent. Avoid a second Kanban workflow.

## Recommendation and feedback model

- **Career profile:** Separate hard constraints, strong preferences, soft preferences, and areas open to surprise. Capture strengths and transferable experience alongside seniority, IC/player-coach versus management, work focus/sectors, location/time zones, employment type, and compensation thresholds. Specific starting values require user review.
- **Assessment:** Evaluate qualification/experience fit separately from personal interest. Explain strengths, concerns, unknowns, and possible dealbreakers in concise conversational language. Distinguish sourced facts from interpretations; do not invent salary, remote policy, requirements, or other posting facts.
- **Strong matches and wildcards:** Most recommendations align closely with the profile. Occasional wildcards challenge preferences for a concrete, explained reason grounded in transferable strengths or compelling work. They do not bypass hard constraints. The initial mix and ranking method remain open.
- **Feedback:** Keep explicit preferences, accept/pass decisions, optional reasons, and learned inferences distinct. Recurring feedback may adjust ranking or suggest profile changes; inferences must be inspectable and reversible. Explicit settings take precedence and cannot be silently overwritten. A single pass must not become a broad exclusion; preserve exploration.
- **Identity and history:** Check Tracker and Radar history before treating a role as new. Use posting IDs, canonical URLs, and cautious company/role/location similarity; flag uncertain duplicates rather than automatically merging them. Unchanged roles already recommended, passed, tracked, or applied to must not repeatedly appear as new. Material changes may justify resurfacing with an explanation. Keep first-seen and last-verified context.

## Opportunity discovery and verification

Discovery finds leads; retrieval/verification obtains authoritative employer or ATS posting facts; [#5](https://github.com/rainbows4dinos/nextchapter/issues/5) assesses qualification fit and personal interest from the available evidence. These are separate responsibilities. A search result, provider snippet or redirect is not proof of a live original posting. Unsupported retrieval remains an explicit unverified lead, not an invented complete assessment.

The source model is extensible while preserving provider-specific capabilities and restrictions:

| Layer | Scope | MVP requirement |
| --- | --- | --- |
| Targeted company ATS listings | Investigate Greenhouse, Ashby, Lever and Workable listing endpoints independently; consider SmartRecruiters, Recruitee and other candidates incrementally | At least one validated targeted listing provider; all four are not required initially |
| Cross-company discovery | A permitted/API-backed provider that searches across employers without a company watchlist; evaluate Adzuna and alternatives such as The Muse | At least one validated source is mandatory; relevant leads across multiple companies, including one outside the watchlist in the validation sample |
| Exploratory discovery | Permitted web search, niche boards, communities and industry directories for unfamiliar companies or adjacent roles | Later expansion; no broad crawling or assumed scraping permission |

Public listing API support and existing single-URL ingestion are different capabilities. Repository ingestion covers allowlisted Greenhouse, Ashby, Lever, account-qualified Workable and limited hosted Workday identities; it does not establish arbitrary company discovery. Reuse existing retrieval adapters where practical while retaining authentication, provider restrictions and outbound allowlists. Workday remains secondary; Teamtailor, BambooHR, Breezy HR, Personio and Rippling are candidates, not coverage commitments. Do not assume access, permission, reliability or completeness for any ATS or board.

### Incremental stages and early feasibility gate

- [4A / #25 — Common model and safe execution](https://github.com/rainbows4dinos/nextchapter/issues/25): source capability/results contract, normalized opportunities and multiple source observations, provenance/freshness, Supabase persistence and ownership, bounded execution and safe partial failures.
- [4B / #26 — Targeted ATS discovery](https://github.com/rainbows4dinos/nextchapter/issues/26): validate company-listing capabilities, implement one ATS source, and expand only with evidence.
- [4C / #27 — Cross-company discovery](https://github.com/rainbows4dinos/nextchapter/issues/27): investigate feasibility first, then integrate at least one permitted provider.

Start 4C feasibility research before locking 4A's contract or overinvesting in ATS coverage. Integration in 4B and 4C depends on 4A; cross-company integration does not wait for all ATS adapters. If no cross-company source is feasible, document the blocker and revisit provider/product choices explicitly. An ATS-only watchlist does not meet MVP.

The feasibility gate requires dated primary-source evidence and account-level validation of access, intended use, ongoing licensing/pricing, quotas and bounded per-run cost; relevant geography/roles/remote coverage; freshness; snippets versus full text; redirects and permission to retrieve original postings; attribution/link-back, caching, persistence, derived assessment and retention/deletion rights. Define a representative query sample, acceptance thresholds and spend/request budget before live validation. Send only necessary search parameters, not private profiles or feedback.

Initial desk research is recorded in #27. [Adzuna's search documentation](https://developer.adzuna.com/docs/search) describes snippets and redirect URLs; its [API terms](https://developer.adzuna.com/docs/terms_of_service) impose access, use and attribution conditions. Compatibility of its third-party-contact language with the proposed original-posting verification flow needs clarification. [The Muse API](https://www.themuse.com/developers/api/v2) and [terms](https://www.themuse.com/developers/api/v2/terms) provide another candidate to evaluate. Neither source is selected or live-validated; current costs, permissions, storage rights and useful coverage remain open.

### Evidence, persistence and failure boundaries

Keep source-scoped external IDs, discovery/provider URL and original/canonical posting URL when known; factual field provenance; stated compensation with currency/period; and explicit missing/conflicting facts. Provider-predicted salary is not employer-stated compensation. Preserve first seen, last seen, last retrieval attempt, last successful original-posting verification and source-reported posting/update dates separately. Discovery freshness is not verification freshness.

Radar opportunities and source observations persist separately from Tracker prospects. 4A owns ingestion identity, canonical aliases and idempotent refresh/upserts; [#9](https://github.com/rainbows4dinos/nextchapter/issues/9) owns history/Tracker checks, suppression, repost/material-change and resurfacing policy. Cross-source observations can refer to one opportunity; external IDs require a source namespace, and uncertain company/role/location similarity flags a possible duplicate rather than silently merging. Preserve provenance and decision history.

Bound source pagination, response sizes, concurrency, timeouts and request/cost budgets. A source outage, quota error or incomplete run preserves usable results and previous successful verification; absence from partial results cannot mark a job closed. Distinguish unverified, verified, closed and unavailable states and per-source success/partial/error outcomes. #6 presents these distinctions and required provider/original links. Discovery and retrieval never create Tracker prospects automatically.

## MVP scope

The MVP completes the core loop with a reviewable profile, limited on-demand multi-source discovery (at least one targeted ATS listing source and one validated permitted cross-company source), transparent personalized assessments, strong matches and occasional wildcards, a focused feed, Add to Prospects, optional Pass feedback, persistent history, duplicate suppression, and basic feedback-informed recommendations.

MVP success includes finding relevant opportunities beyond selected companies with representative original-posting verification and honest unresolved-lead states. The user can understand why a role surfaced, decide quickly, find an accepted role once in Tracker, and retain decisions across refreshes. Repeat feedback can influence future recommendations without silently changing explicit preferences. The precise depth of learning remains a feature decision.

## Non-goals

- Broad internet crawling or a comprehensive generic job aggregator.
- Scheduled discovery, notifications, natural-language search, salary estimation, or sophisticated autonomous learning in the MVP.
- Automated applications or automatically adding every discovered role to Tracker.
- Replacing Tracker's application workflow or rebuilding Résumé Builder.

## Open decisions

| Decision | Feature |
| --- | --- |
| Profile UI versus lightweight configuration, versioning, and unknown compensation treatment | [#3](https://github.com/rainbows4dinos/nextchapter/issues/3) |
| Cross-company feasibility/access/terms/pricing, original-posting resolution permission, coverage, attribution/retention and freshness strategy | [#4](https://github.com/rainbows4dinos/nextchapter/issues/4) |
| Minimum evidence, assessment representation, ranking, wildcard mix, reevaluation triggers, and cost limits | [#5](https://github.com/rainbows4dinos/nextchapter/issues/5) |
| Feed ordering, card density, and placement of detailed rationale | [#6](https://github.com/rainbows4dinos/nextchapter/issues/6) |
| Already-tracked behavior and whether passes can be undone | [#7](https://github.com/rainbows4dinos/nextchapter/issues/7) |
| Feedback storage/model, MVP learning depth, confirmation prompts, and ranking transparency | [#8](https://github.com/rainbows4dinos/nextchapter/issues/8) |
| Canonical identity, historical import, material-change thresholds, and resurfacing rules | [#9](https://github.com/rainbows4dinos/nextchapter/issues/9) |

## Architecture constraints

Follow [repository instructions](../../AGENTS.md) and the [project overview](../../README.md). Career Radar stays within nextchapter and reuses its static HTML/JavaScript architecture, shared design system, navigation, themes, and responsive patterns. No framework or deployment restructuring is implied by this plan.

Radar owns discovery, assessment, recommendation/decision history, and feedback; Tracker owns accepted prospects, application progress, and outcomes. Their opportunity identity must support duplicate checks without treating every discovery as a prospect.

Persistence is Supabase, with Auth and RLS protecting private records. Opportunity records and personal feedback belong outside this public repository; browser code cannot hold secrets. Reuse canonical career facts and framing without copying them into this spec. Résumé formatting rules are not opportunity evaluation criteria.

Keep costs low: no AI in first-pass eligibility filtering; bound source work and use permitted caching before selective AI evaluation and cached assessments for unchanged postings/profile versions. Provider secrets stay server-side; minimize search parameters and sanitize diagnostics. Upstream content remains inert. Existing allowlisted URL ingestion can inform source planning, but manual posting retrieval does not establish discovery coverage.

Older [career-radar-v0 setup documentation](../career-radar-v0.md) describes today's Prospect Tracker. The current Radar route is a coming-soon page, and the legacy directory redirects to Tracker. This spec defines planned Radar behavior without prescribing new schemas, endpoints, providers, or component structures.

## Feature issues

| Issue | Capability |
| --- | --- |
| [#3 — Career profile and preference model](https://github.com/rainbows4dinos/nextchapter/issues/3) | Reviewable strengths, preferences, and constraints |
| [#4 — Extensible multi-source opportunity discovery](https://github.com/rainbows4dinos/nextchapter/issues/4) | 4A common foundation, 4B targeted ATS and 4C required cross-company discovery; original-posting evidence and freshness |
| [#5 — Transparent fit assessment and wildcards](https://github.com/rainbows4dinos/nextchapter/issues/5) | Explainable relevance and exploration |
| [#6 — Opportunity feed and review UX](https://github.com/rainbows4dinos/nextchapter/issues/6) | Focused review and primary actions |
| [#7 — Add to Prospects and optional Pass feedback](https://github.com/rainbows4dinos/nextchapter/issues/7) | Tracker handoff and lightweight decisions |
| [#8 — Feedback-informed recommendations](https://github.com/rainbows4dinos/nextchapter/issues/8) | Controlled learning from decisions |
| [#9 — Duplicate detection and recommendation history](https://github.com/rainbows4dinos/nextchapter/issues/9) | Recognition, suppression, and reconsideration |
