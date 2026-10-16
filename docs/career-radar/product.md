# Career Radar product spec

Status: Living product plan; profile editor implemented for #3 (hosted migration confirmed); the server-side discovery/verification foundation is implemented locally but not deployed; the opportunity feed and review workflow are implemented locally, with live discovery disabled and the new opportunity-table migration pending hosted application.
Updated: 2026-10-16
Parent: [#2 — Product overview and MVP](https://github.com/rainbows4dinos/nextchapter/issues/2)

## Vision

Productize Consumer Design Job Watch as an on-demand personalized opportunity feed. **Core loop:** Reviewed Career Profile → Find Opportunities → live-web AI research → sourced recommendations → Accept or Pass → explicit Add to Prospects → learn from decisions.

This is a lightweight research-and-review workflow, **not** a dedicated ATS crawler or job aggregation platform. ChatGPT's scheduled watch is not automatically a developer API.

## MVP

1. Use the reviewed, editable Career Profile (#3), respecting explicit preferences and hard constraints.
2. A user clicks **Find Opportunities**. Server-side live-web-search-capable AI, or a search API combined with a model, researches publicly discoverable opportunities across employers and job boards. Plain model recollection is not live discovery.
3. Return up to five distinct relevant opportunities per run, including unfamiliar companies and occasional justified wildcards. Explain qualification fit separately from personal interest, plus concerns and unknowns (#5).
4. Show employer/title, evidenced location/compensation, source and original URLs where available, search/check time, and clear verified/unverified states. A search hit or snippet does not prove an employer posting is active (#6).
5. **Accept** records interest in Radar. **Add to Prospects** separately and explicitly creates/reuses a Prospect Tracker record. **Pass** is an alternative to Accept and optionally captures a reason; both decisions can be reversed (#7).
6. Preserve user decisions and enough permitted identifiers to suppress unchanged previously considered opportunities (#9). Feedback can inform future searches but must not silently change explicit profile settings (#8).

## Technical direction

- Start with a bounded **proof of concept** comparing a simple live-web research API approach against representative Consumer Design Watch results (#27).
- Then build only the minimal research-run/result contract, server-side secrets, Supabase Auth/RLS history, safe response validation, provenance, partial failure handling and measurable per-run budgets (#25).
- Discovery and personalized assessment may occur in one bounded research call, as long as facts are traceable and interpretation is labeled.
- Search links and employer links remain distinct. Check original postings through permitted routes where practical; never invent missing facts, claim a search hit is verified open, or treat failed retrieval as proof of closure.
- Respect source attribution, permitted caching/retention, API conditions and safe URL handling. Store minimal decision history and allowed metadata, not a bulk archive of licensed descriptions.
- On-demand only, no background search. Bound requests, tokens, latency and cost. Do not promise an exact cost estimate without supporting API usage/pricing data.
- Reuse existing static HTML/JavaScript, shared design system and existing Prospect Tracker single-URL ingestion. No framework rewrite.

## Backlog and sequence

- [#2 Product overview](https://github.com/rainbows4dinos/nextchapter/issues/2)
- [#3 Career Profile](https://github.com/rainbows4dinos/nextchapter/issues/3): reviewed editor already built.
- [#27 AI web research PoC](https://github.com/rainbows4dinos/nextchapter/issues/27): two experiments documented; source quality and controlled product acceptance remain unresolved.
- [#25 Minimal research contract](https://github.com/rainbows4dinos/nextchapter/issues/25): bounded discovery/verification foundation implemented; disabled production release preparation is approved.
- [#4 Discovery](https://github.com/rainbows4dinos/nextchapter/issues/4), [#5 Assessment](https://github.com/rainbows4dinos/nextchapter/issues/5), [#6 Feed](https://github.com/rainbows4dinos/nextchapter/issues/6): Find Opportunities to reviewable recommendations.
- [#7 Add/Pass](https://github.com/rainbows4dinos/nextchapter/issues/7), [#9 History](https://github.com/rainbows4dinos/nextchapter/issues/9), [#8 Feedback](https://github.com/rainbows4dinos/nextchapter/issues/8): complete the loop.
- [#26 Targeted ATS listing discovery](https://github.com/rainbows4dinos/nextchapter/issues/26): **deferred optional enhancement**, not an MVP dependency.

## Previous source research

The [cross-company API spike](discovery-source-spike.md) reviewed Himalayas, Adzuna, The Muse, Jooble, Remotive and Brave. Its findings remain useful reference material, but do not require integrating an aggregator. Himalayas surfaced relevant remote design jobs; structured API access, original-posting verification and content-retention rights were not fully validated.

## Non-goals

No mandatory ATS adapter, aggregator API, bulk crawling, large job corpus, provider configuration UI, scheduled discovery, notifications, automatic applications, salary predictions or elaborate learning in MVP.

## Open decisions

| Decision | Feature |
| --- | --- |
| Profile editing, versioning and unknown compensation: see [implemented decisions](profile.md); conversational proposals remain later work | [#3](https://github.com/rainbows4dinos/nextchapter/issues/3) |
| Initial sources, API/retrieval restrictions, coverage, reliability, and refresh strategy | [#4](https://github.com/rainbows4dinos/nextchapter/issues/4) |
| Minimum evidence, assessment representation, ranking, wildcard mix, reevaluation triggers, and cost limits | [#5](https://github.com/rainbows4dinos/nextchapter/issues/5) |
| Feed ordering, card density, and placement of detailed rationale | [#6](https://github.com/rainbows4dinos/nextchapter/issues/6) |
| Exact Tracker identities are reused; Accept/Pass can be undone. Broader handoff policy remains open | [#7](https://github.com/rainbows4dinos/nextchapter/issues/7) |
| Feedback storage/model, MVP learning depth, confirmation prompts, and ranking transparency | [#8](https://github.com/rainbows4dinos/nextchapter/issues/8) |
| Canonical identity, historical import, material-change thresholds, and resurfacing rules | [#9](https://github.com/rainbows4dinos/nextchapter/issues/9) |

## Architecture constraints

Follow [repository instructions](../../AGENTS.md) and the [project overview](../../README.md). Career Radar stays within nextchapter and reuses its static HTML/JavaScript architecture, shared design system, navigation, themes, and responsive patterns. No framework or deployment restructuring is implied by this plan.

Radar owns discovery, assessment, recommendation/decision history, and feedback; Tracker owns accepted prospects, application progress, and outcomes. Their opportunity identity must support duplicate checks without treating every discovery as a prospect.

Persistence is Supabase, with Auth and RLS protecting private records. Opportunity records and personal feedback belong outside this public repository; browser code cannot hold secrets. Reuse canonical career facts and framing without copying them into this spec. Résumé formatting rules are not opportunity evaluation criteria.

For AI-led discovery, the model researches provisional candidates before they exist for deterministic screening. The [#25 foundation](discovery-foundation.md) then validates output/provenance, suppresses supplied decisions and performs bounded independent availability checks. This explicitly replaces the earlier assumption that all discovery can be screened before any AI call. Deeper qualification ranking and cached assessment policy remain #5; no cache or assessment persistence is implemented. Existing allowlisted URL ingestion can inform URL safety, but manual posting retrieval does not establish discovery coverage.

Older [career-radar-v0 setup documentation](../career-radar-v0.md) describes today's Prospect Tracker. The current Radar route provides the [career profile editor](profile.md) and [opportunity feed](opportunity-feed.md), and the legacy directory redirects to Tracker. This spec defines planned Radar behavior without prescribing new schemas, endpoints, providers, or component structures.

## Feature issues

| Issue | Capability |
| --- | --- |
| [#3 — Career profile and preference model](https://github.com/rainbows4dinos/nextchapter/issues/3) | Reviewable strengths, preferences, and constraints |
| [#4 — Discover and normalize opportunities](https://github.com/rainbows4dinos/nextchapter/issues/4) | Reliable sources, posting facts, and freshness |
| [#5 — Transparent fit assessment and wildcards](https://github.com/rainbows4dinos/nextchapter/issues/5) | Explainable relevance and exploration |
| [#6 — Opportunity feed and review UX](https://github.com/rainbows4dinos/nextchapter/issues/6) | Focused review and primary actions |
| [#7 — Add to Prospects and optional Pass feedback](https://github.com/rainbows4dinos/nextchapter/issues/7) | Tracker handoff and lightweight decisions |
| [#8 — Feedback-informed recommendations](https://github.com/rainbows4dinos/nextchapter/issues/8) | Controlled learning from decisions |
| [#9 — Duplicate detection and recommendation history](https://github.com/rainbows4dinos/nextchapter/issues/9) | Recognition, suppression, and reconsideration |

## Opportunity-feed implementation

See [the #6 implementation and validation notes](opportunity-feed.md). The approved workflow is New → Accept → Add to Prospects, with Pass as an alternative and explicit decision reversal. Accept alone never imports a Tracker record. One user-owned Supabase table stores small fact/claim-aware cards and current decisions; no full descriptions or raw provider responses are retained. The disabled production release is approved; hosted acceptance is pending. Live-discovery enablement and paid requests remain separately approval-gated.

This document captures cross-feature intent; linked issues define feature acceptance. The approved release preserves on-demand research and minimal storage rather than adding ATS discovery infrastructure.
