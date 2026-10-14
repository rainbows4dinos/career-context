# Career Radar product spec

Status: Living product plan; discovery and recommendation workflows are not implemented.
Updated: 2026-10-14
Parent: [#2 — Product overview and MVP](https://github.com/rainbows4dinos/nextchapter/issues/2)

## Goals

Productize the Consumer Design Watch workflow as a personalized opportunity feed informed by the user's strengths, interests, and practical constraints. Surface a small number of opportunities worth considering, mostly preferred roles with occasional explainable surprises. Improve relevance through decisions while keeping the user in control.

**Core loop:** Discover → Recommend → Add to Prospects or Pass → Learn.

This document captures cross-feature product intent. Linked issues hold feature requirements and acceptance criteria. Update both when a decision changes; resolve conflicts explicitly. Open decisions below are unresolved, not implementation instructions. Create implementation tasks only when a feature is ready to build.

## User experience

1. Review and edit a career profile before recommendations depend on it. Seed it from reviewed Consumer Design Watch learnings and canonical career context; do not blindly import chat memory.
2. Initiate discovery on demand from selected reliable sources, covering target companies and some exploratory discovery.
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

## MVP scope

The MVP completes the core loop with a reviewable profile, limited on-demand discovery, transparent personalized assessments, strong matches and occasional wildcards, a focused feed, Add to Prospects, optional Pass feedback, persistent history, duplicate suppression, and basic feedback-informed recommendations.

MVP success means the user can understand why a role surfaced, decide quickly, find an accepted role once in Tracker, and retain decisions across refreshes. Repeat feedback can influence future recommendations without silently changing explicit preferences. The precise depth of learning remains a feature decision.

## Non-goals

- Broad internet crawling or a comprehensive generic job aggregator.
- Scheduled discovery, notifications, natural-language search, salary estimation, or sophisticated autonomous learning in the MVP.
- Automated applications or automatically adding every discovered role to Tracker.
- Replacing Tracker's application workflow or rebuilding Résumé Builder.

## Open decisions

| Decision | Feature |
| --- | --- |
| Profile UI versus lightweight configuration, versioning, and unknown compensation treatment | [#3](https://github.com/rainbows4dinos/nextchapter/issues/3) |
| Initial sources, API/retrieval restrictions, coverage, reliability, and refresh strategy | [#4](https://github.com/rainbows4dinos/nextchapter/issues/4) |
| Minimum evidence, assessment representation, ranking, wildcard mix, reevaluation triggers, and cost limits | [#5](https://github.com/rainbows4dinos/nextchapter/issues/5) |
| Feed ordering, card density, and placement of detailed rationale | [#6](https://github.com/rainbows4dinos/nextchapter/issues/6) |
| Already-tracked behavior and whether passes can be undone | [#7](https://github.com/rainbows4dinos/nextchapter/issues/7) |
| Feedback storage/model, MVP learning depth, confirmation prompts, and ranking transparency | [#8](https://github.com/rainbows4dinos/nextchapter/issues/8) |
| Canonical identity, historical import, material-change thresholds, and resurfacing rules | [#9](https://github.com/rainbows4dinos/nextchapter/issues/9) |

## Architecture constraints

Follow [repository instructions](../../AGENTS.md) and the [project overview](../../README.md). Career Radar stays within nextchapter and reuses its static HTML/JavaScript architecture, shared design system, navigation, themes, and responsive patterns. No framework or deployment restructuring is implied by this plan.

Radar owns discovery, assessment, recommendation/decision history, and feedback; Tracker owns accepted prospects, application progress, and outcomes. Their opportunity identity must support duplicate checks without treating every discovery as a prospect.

Persistence is Supabase, with Auth and RLS protecting private records. Opportunity records and personal feedback belong outside this public repository; browser code cannot hold secrets. Reuse canonical career facts and framing without copying them into this spec. Résumé formatting rules are not opportunity evaluation criteria.

Keep costs low through deterministic eligibility screening before selective AI evaluation and cached assessments for unchanged postings/profile versions. Existing allowlisted URL ingestion can inform source planning, but manual posting retrieval does not establish discovery coverage.

Older [career-radar-v0 setup documentation](../career-radar-v0.md) describes today's Prospect Tracker. The current Radar route is a coming-soon page, and the legacy directory redirects to Tracker. This spec defines planned Radar behavior without prescribing new schemas, endpoints, providers, or component structures.

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
