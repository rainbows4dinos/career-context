# Career Radar product spec

Updated: 2026-10-15. Living plan; discovery workflow is not implemented.

## Vision

Productize Consumer Design Job Watch as an on-demand personalized opportunity feed. **Core loop:** Reviewed Career Profile → Find Opportunities → live-web AI research → sourced recommendations → Add to Prospects or Pass → learn from decisions.

This is a lightweight research-and-review workflow, **not** a dedicated ATS crawler or job aggregation platform. ChatGPT's scheduled watch is not automatically a developer API.

## MVP

1. Use the reviewed, editable Career Profile (#3), respecting explicit preferences and hard constraints.
2. A user clicks **Find Opportunities**. Server-side live-web-search-capable AI, or a search API combined with a model, researches publicly discoverable opportunities across employers and job boards. Plain model recollection is not live discovery.
3. Return up to five distinct relevant opportunities per run, including unfamiliar companies and occasional justified wildcards. Explain qualification fit separately from personal interest, plus concerns and unknowns (#5).
4. Show employer/title, evidenced location/compensation, source and original URLs where available, search/check time, and clear verified/unverified states. A search hit or snippet does not prove an employer posting is active (#6).
5. **Add to Prospects** explicitly creates/reuses a Prospect Tracker record. **Pass** is quick and optionally captures a reason (#7).
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
- [#27 AI web research PoC](https://github.com/rainbows4dinos/nextchapter/issues/27): **next**. Establish live-web capability, source quality, price and limitations.
- [#25 Minimal research contract](https://github.com/rainbows4dinos/nextchapter/issues/25): build only what the PoC justifies.
- [#4 Discovery](https://github.com/rainbows4dinos/nextchapter/issues/4), [#5 Assessment](https://github.com/rainbows4dinos/nextchapter/issues/5), [#6 Feed](https://github.com/rainbows4dinos/nextchapter/issues/6): Find Opportunities to reviewable recommendations.
- [#7 Add/Pass](https://github.com/rainbows4dinos/nextchapter/issues/7), [#9 History](https://github.com/rainbows4dinos/nextchapter/issues/9), [#8 Feedback](https://github.com/rainbows4dinos/nextchapter/issues/8): complete the loop.
- [#26 Targeted ATS listing discovery](https://github.com/rainbows4dinos/nextchapter/issues/26): **deferred optional enhancement**, not an MVP dependency.

## Previous source research

The [cross-company API spike](discovery-source-spike.md) reviewed Himalayas, Adzuna, The Muse, Jooble, Remotive and Brave. Its findings remain useful reference material, but do not require integrating an aggregator. Himalayas surfaced relevant remote design jobs; structured API access, original-posting verification and content-retention rights were not fully validated.

## Non-goals

No mandatory ATS adapter, aggregator API, bulk crawling, large job corpus, provider configuration UI, scheduled discovery, notifications, automatic applications, salary predictions or elaborate learning in MVP.

## Open decisions

Choose an accessible web-search-capable research API with grounded URLs and affordable per-run cost (#27); determine minimal output/history fields and retention (#25); define verification and abstention behavior (#4/#5), feed states (#6), and identity/resurfacing policy (#9).

This document captures cross-feature intent; linked issues define feature acceptance. No application code is authorized by this planning update.
