# Career Radar opportunity feed — #6

Implemented locally on October 16, 2026 under the approved single-table architecture. **Uncommitted, not deployed; migration not applied to hosted Supabase; live discovery remains disabled.** No paid calls, billing changes, new dependencies, services, frameworks or adapters were introduced. [#6](https://github.com/rainbows4dinos/nextchapter/issues/6), [#7](https://github.com/rainbows4dinos/nextchapter/issues/7), [#9](https://github.com/rainbows4dinos/nextchapter/issues/9), and the user's explicit approval define this work. The current user instruction supersedes #7's older implication that Accept itself creates a Tracker record.

## Workflow and interface

The existing [Career Radar page](../../tools/career-radar.html) now contains the opportunity feed and an expandable career profile editor. Existing URLs, navigation, themes, public configuration and shared Supabase client are retained. New, Accepted, Passed and All views contain saved opportunities across runs. Each individual research response is limited to five candidates; the saved views may accumulate more than five.

**New → Accept → Add to Prospects**, with Pass as an alternative to Accept. Accept records interest in Radar only. Pass removes the card from New; its optional category/note is private, and no reason is required. Return to New reverses either decision. Changing a linked card's Radar decision never removes or changes the Tracker record. Actions wait for confirmed writes; failed choices and feedback remain pending in memory with explicit retry. Navigation/reload/sign-out warnings protect pending writes; forcing a reload can still discard an unsaved choice. Confirmed decisions survive reload and new research.

The Find Opportunities action uses the last saved reviewed profile. The interface includes loading, running, completed, empty, partial and error outcomes. Failed research and failed history reads retain earlier cards. Partial leads are presented separately and require Keep lead before persistence. Failed result saves show unsaved cards and Retry saving results; retrying does not make another research request. The interface prevents a new search while results await saving.

Company/title fall back to explicitly labeled AI claims when independent facts are missing. Independent location/pay and unknown eligibility remain separate from unverified AI claims. Fit, concerns and wildcards contain no numerical score. Availability is an observed result with a check timestamp, never a hiring guarantee. Verification and sources expand to show source links, consultation provenance, and the distinction between Apply control, plausible form and unknown route. All content is rendered as text; external HTTPS links are validated and use noopener/noreferrer.

Last searched this session records the returned run time, including empty/failed outcomes when an envelope is available. After reload, Latest saved discovery reports the newest saved card's research time. This is deliberately not a durable all-run/empty-search log. Costs, when supplied, are labeled unconfirmed estimates.

## One table and existing security boundaries

The sole new table is `public.radar_opportunities`, defined in [the migration](../../supabase/migrations/20261016000000_radar_opportunities.sql). It holds:

- UUID, immutable owner and normalized identity key, unique per owner/identity.
- A bounded card snapshot: independently retrieved facts, AI claims, short fit/concerns, source URL references and verification/application observations, profile revision and research time.
- `new`, `accepted` or `passed` decision; optional Pass category and note (500-character maximum); database-owned decision/update/creation/last-observation timestamps.
- A nullable reference to an explicitly created/reused Prospect Tracker record.

Client projection discards descriptions, source excerpts, raw provider responses, full tool traces and unknown payload properties. Snapshots have a 28,000-byte client ceiling and 32,768-byte SQL ceiling (including PostgreSQL serialization whitespace); schema checks reject unexpected top-level snapshot sections and unexpected fact/claim fields. This is a small snapshot of the original observation, not a scraped posting archive. Rediscovery leaves existing saved snapshots and decisions unchanged; it does not silently replace the evidence on which a decision was made. Last observation therefore describes that saved snapshot, not every later suppressed appearance.

Auth sessions use the shared client. RLS permits authenticated users to select/insert/update only their own rows; anonymous access and deletion are not granted. Inserts explicitly assert the originating owner, so a session change cannot silently save a former user's lead into a different account. Ownership/identity are immutable. Updates use the exact Supabase `updated_at` string, preserving microseconds. New research inserts only new identities, never upserts over a decision. A lost insert response is reconciled by owner/identity before reporting failure.

The migration additionally grants authenticated insertion of the existing `prospects.owner_id` column. This allows Radar's handoff to assert its originating owner explicitly; the existing prospect RLS policy still requires equality with `auth.uid()`. It does not grant cross-user access or owner updates. The existing Tracker create helper gains an optional owner assertion; existing callers keep their current behavior. Prospect statuses, triggers and history creation are unchanged.

The new table's trigger verifies that a linked prospect belongs to the same owner and that linking happens after acceptance. Once linked, its reference cannot be cleared or substituted through ordinary updates. No service-role key or privileged fallback is used. Sign-out/account changes clear private feed content and invalidate late results. Public configuration still contains only the existing browser-safe Supabase settings.

## Duplicate suppression and handoff

History and Tracker identities are read with pagination before research and again before merging results. Any failed read blocks the merge/search rather than implying empty history. Up to 100 saved decisions enter #25's existing request contract; its existing minimal prompt exclusions remain bounded. The complete saved history is checked again locally, so older decisions outside that request bound cannot reappear under the same normalized identity. They can still waste discovery yield; the UI reports fewer new results without an automatic paid retry.

Existing posting identity normalization handles supported ATS identities and generic URL tracking parameters. Exact Tracker matches are excluded from new discovery. Possible company/title/location matches are flagged for review, including possible prior Radar reviews; distinct known posting identities are not silently merged. Changed URLs/reposts can still need manual comparison. General resurfacing policy and richer alias reconciliation remain #9; no warehouse or extra history table was added.

Only Add to Prospects creates or reuses a Tracker record. It rechecks current acceptance and Tracker identities. A single exact match is reused without status edits; multiple exact matches or possible duplicates require an explicit choice. Creating a separate record is unavailable when an exact match exists. New Tracker records use the opportunity UUID as a retained creation identity and import minimal displayed company/title, original/discovery URL, independent location/pay and source. They never import full descriptions or AI-estimated compensation. AI-only company/title remain visibly unverified before the user chooses this action; a short existing Tracker note preserves that uncertainty after handoff.

Creation and linking are two guarded writes, not a distributed transaction. If creation succeeds but its response or link save fails, the UI explains that creation may have succeeded. Retry reconciles the same UUID or exact identity, creating no second prospect/history event. A concurrent Pass may prevent the final link even though the already-authorized Tracker creation succeeded; review Tracker and explicitly Accept again before reconciling. This recovery path avoids additional RPC infrastructure. Existing records retain their status/history; creating a new prospect produces the normal single initial event through the existing database trigger.

## Development, setup and validation

[radar-research-client.js](../../tools/prospect-tracker/radar-research-client.js) has `RESEARCH_ENABLED=false`. The production Find button remains disabled, with an explanation. The client also refuses invocation while disabled; no URL parameter, browser-storage override or mock mode enables paid research. The server's existing enablement/billing flags are unchanged. Separately authorized migration application, hosted Auth/RLS acceptance and discovery enablement are still required before production use.

For local browser acceptance, run from the repository root:

```sh
node tools/prospect-tracker/tests/fixtures/feed-server.js
```

Open `http://127.0.0.1:8778/__feed`. This disposable fixture uses embedded PostgreSQL with the actual migrations/RLS, the vendored Supabase SDK, synthetic Auth and fictional research responses. Its local-only entry signs into a synthetic account and provides completed/fresh/partial/empty/error/slow/untrusted-text scenarios and failure controls. It never calls OpenAI or hosted Supabase. Stop it after testing; do not treat this fixture as a production login or deployment.

The new Node suite covers SQL ownership/anonymous isolation, identity uniqueness, immutable fields, owned Tracker links, stale writes, decision round trips, history failures before/after research, suppression beyond 100 decisions, partial/failed/empty results, result-save retries without another research request, profile changes, disposal during asynchronous work, optional feedback, normalized tracking aliases, multiple exact matches and idempotent handoff. Existing Tracker persistence/status/history and ingestion suites remain included. Run scoped `npm test`, `npm run typecheck`, `npm run lint`, `npm run functions:typecheck`, `npm run functions:lint`, and `npm run test:functions`.

The new table types were derived from migration-based PGlite introspection, retaining the existing hosted table definitions. The local type generator includes the table for future bootstrap generation. Regenerate authoritative hosted types after separately approved migration application. No hosted state was changed during implementation.

## Local validation result

Final checks: **167 Node tests passed (16 new feed tests), six Deno ingestion tests passed**, scoped TypeScript and both Deno function checks passed, ESLint and Deno lint passed, and relative-link/whitespace checks passed. Loopback permission was needed for the existing and new local persistence fixtures. Chrome acceptance covered saved-card reloads, Accept without Tracker import, explicit Add to Prospects, failed Pass/retry, optional Pass feedback across reload, reversal, partial Keep lead, result-save retry without another research request, loading/completed states, failed history blocking, inert markup, and sign-out clearing. Desktop 1440px and phone 390px layouts had no horizontal overflow in the checked views; both themes were checked. Selected-filter contrast and a stale retry-error message were corrected during validation. The production page was checked with live discovery disabled and one main landmark. Screen-reader speech output and hosted migration/deployment acceptance remain untested.

No commits, pushes, deployments, paid calls or issue-status changes were made. Preexisting profile/style work and the user's résumé edits were preserved.
