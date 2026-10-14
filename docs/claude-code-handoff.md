# Claude Code handoff — nextchapter

Prepared October 14, 2026. Implementation baseline: `352e55b` on `main`, pushed to `origin/main`. GitHub Pages run [38646760487](https://github.com/rainbows4dinos/nextchapter/actions/runs/38646760487) completed successfully for that commit; verified during this handoff. This handoff update is a subsequent documentation-only change, not yet committed.

## Start here

Read [AGENTS.md](../AGENTS.md), then inspect the current working tree. [CLAUDE.md](../CLAUDE.md) imports the shared instructions; it does not own a separate policy. Preserve concurrent edits. This document records implementation state and validation limits, not authorization for additional features.

nextchapter is the product/repository name; GitHub Pages uses `/nextchapter/`. Prospect Tracker is the existing authenticated application at `tools/prospect-tracker/`. Career Radar remains a public coming-soon page at `tools/career-radar.html`; discovery and recommendation workflows are not implemented.

The [Career Radar product spec](career-radar/product.md) is a living plan. Linked issues own feature requirements/acceptance criteria, and unresolved decisions are not implementation instructions. [Product enhancement](../.github/ISSUE_TEMPLATE/product-enhancement.md) and [product idea](../.github/ISSUE_TEMPLATE/product-idea.md) issue templates were added independently and preserved when integrating the latest UI changes. There is no assigned follow-up implementation task.

## Latest implementation checkpoints

| Commit | Result / reference |
| --- | --- |
| `ec8bf6e` | Moved Tracker from `tools/career-radar/` to `tools/prospect-tracker/`; updated navigation, shared auth/asset imports, Pages public-config generation, ingestion imports, tests and documentation. See [navigation](nextchapter-navigation.md). |
| `f636c16` | Ashby whole-board responses have a fixed 4 MiB ceiling; the selected job retains a 1 MiB serialized UTF-8 limit. Other posting/metadata limits remain unchanged. See [Ashby correction](career-radar-ashby-lever-ingestion.md#ashby-board-size-correction--october-13-2026). |
| `f69a673` | Removed the board's permanent Refresh button. A stale-revision move rolls back and offers contextual Reload board, preserving board state. See [board behavior](prospect-tracker-kanban.md). |
| `f8bbb2c` | Added limited Workable import from its spike, with public detail/account retrieval and existing editable preview/duplicate/save flows. See [implementation and acceptance](prospect-tracker-workable-ingestion.md) and [original spike](prospect-tracker-workable-spike.md). |
| `ea1ee81` | Added root [index.html](../index.html), which opens `tools/prospect-tracker/#/board`. Published root and destination returned HTTP 200; signed-out visitors use Tracker's existing login. |
| `352e55b` | Matched the Details status sidebar to Builder's results sidebar, renamed the selector label to Change Status, and normalized content-card radii through shared tokens. |

`tools/career-radar/index.html` is a compatibility redirect for old Tracker bookmarks, preserving queries/hashes with `location.replace()`. It is not the future Radar application. Preserve the placeholder and redirect distinction. Internal names such as `getRadarClient()`, the scoped package name and the Supabase project identity were not renamed.

## Current UI and shared foundations

- [tokens.css](../tools/shared/tokens.css) owns semantic colors/themes, typography, spacing and radii. Outer Builder cards, Tracker panels and board columns consume `--nc-radius-panel` (currently 12px). Smaller prospect cards, Alerts, Toasts and legacy feedback surfaces consume `--nc-radius-default` (8px). Hardcoded 24px preview/sidebar overrides are removed. Navigation pills, switches, badges and popovers retain their component shapes. See [card-radius ownership](shared-design-tokens.md#content-card-radii--october-14-2026).
- The Details sidebar has 28px padding, 28px between current-status/history zones and 16px/24px medium Inter section headings, with 8px below headings. An extra 8px above the status form supplements its normal 12px content gap. Helper text/timestamps use shared small-body typography. Both zones sit in one semantic aside; history loading/errors do not add a nested panel. See [Details sidebar](career-radar-v0.md#prospect-details-status-sidebar).
- Change Status still saves immediately through the existing guarded status write and database history trigger. Badge/history updates, failure rollback, draft preservation and pending-save guards remain intact. The current badge is independent of the select label.
- Board search, column scrolling, Done disclosure and native desktop drag behavior remain as documented in [the board guide](prospect-tracker-kanban.md). Browser reload is available for general refresh; the contextual Reload board action is specifically for conflicting edits.
- Color/theme/typography foundations, native fields and status components remain covered by [Phase 1](nextchapter-shared-foundations-phase1.md), [Actions](nextchapter-actions-phase2a.md) and [Inputs and Status](nextchapter-inputs-status-phase2b.md). Earlier audits describe historical baselines; use current code and live Figma when a new design task requires it. No full accessibility-conformance claim has been made.

## Navigation and account behavior to preserve

[navigation.mjs](../tools/shared/navigation.mjs) and [navigation.css](../tools/shared/navigation.css) serve all four suite pages. Large starts at 1200px, Medium at 900px, Small below 900px. Large exposes utilities directly; Medium uses an ellipsis popover; Small expands navigation in document flow. The wordmark opens Tracker.

The Medium utility panel contains About and session-aware Log In/Log Out. Preserve Escape/focus return, outside-click and focus-leave dismissal, responsive resets and the existing pointer protections: `event.composedPath()` handles replaced icons, and inside pointer presses suppress focus dismissal until release. Programmatic `.click()` alone previously missed these cases. Navigation uses native semantics, not an ARIA menu/modal.

The theme switch remains 48×28 with a 20px thumb, default Dark, `body.light`, guarded `localStorage.theme`, cross-tab updates and reduced-motion behavior. Standard transition tokens are defined in [the shared-token guide](shared-design-tokens.md#standard-ui-transitions--october-13-2026).

[supabase-client.js](../tools/prospect-tracker/supabase-client.js) caches `getRadarClient()` within a page; Tracker bootstrap and the shared header reuse it. Public pages initialize authentication without loading prospect data. [navigation-return.mjs](../tools/shared/navigation-return.mjs) permits exact same-origin suite entry paths, preserves queries/hashes and removes nested `returnTo`. Login elsewhere opens Tracker and returns after authentication; login on Tracker focuses its existing form. Logout stays on the current page and retains dirty-editor/pending-write protections.

Public Builder/About/Radar content stays usable without account configuration; the account control offers Retry account. Keep browser-safe configuration generation and committed SDK import maps. Keep matching module cache revisions so shared navigation initializes once and cached provider/UI assets do not mask newly published behavior.

## Ingestion and deployment status

Greenhouse, Ashby, Lever and limited hosted Workday retain their existing implementations; provider guides own supported identities and hosted results. The Ashby size fix was deployed and the previously failing public posting successfully produced an authenticated live preview without saving a prospect.

Workable accepts account-qualified `https://apply.workable.com/{account}/j/{shortcode}/` links, including `/apply` and tracking aliases. Accountless short links, custom domains and employer subdomains are deliberately unsupported; open a short link and copy its resolved full address. Retrieval is bounded to two fixed public GETs with exact posting/account identity checks. Company can remain blank after optional metadata retrieval failure; unsupported compensation/date facts stay blank with warnings. Do not infer them from undocumented fields or slug/title guesses.

The existing `job-ingest` function was redeployed on October 14 with Workable support and JWT verification enabled. Existing Pages-origin preflight returned 204; unauthenticated POST returned 401. Workable frontend commit `f8bbb2c` and latest styling commit `352e55b` have successful Pages runs. No migrations or secret changes were made for these additions. Pages deployment success does not establish authenticated Workable/Supabase-egress compatibility; see the gaps below.

The static Pages site, Anthropic proxy Worker and Supabase function deploy separately. The latest UI/radius changes required only Pages; no Worker deployment was performed. Keep function-first deployment order for future ingestion additions. Current entry pages version token/component/Tracker stylesheets with `20261014-card-radii`; Tracker bootstrap/app/UI use `20261014-status-sidebar`, while the provider import-map entry retains its Workable revision.

## Validation and reproduction

Recorded checks, not rerun for this documentation edit:

- Workable checkpoint: 113 scoped Node tests, application typecheck/lint, function typecheck/lint and six Deno tests passed. Native public-fetch smoke checks passed for Workable and Hugging Face using exactly two ATS requests per posting. Synthetic retrieval/Cancel wrote nothing; failed Save retained facts, and retry created one prospect with one normal history event.
- Workable local browser: short-link guidance, complete/partial previews, required missing Company, edit/Cancel, failed-save retention/retry, saved details/history/reload, duplicate detection for apply/tracking aliases, and ordinary Save blocked pending duplicate review. Open existing's native draft-discard confirmation stalled automation; completion of that interaction and Save separately were not verified for Workable. Later sidebar/radius browser checks worked, so do not assume browser control remains unavailable.
- URL migration navigation acceptance: all four pages, both themes and seven widths, real-pointer About and login/return/logout in three layouts, persisted sessions, cross-tab clearing, safe returns, dirty logout and zero prospect/history writes. Legacy directory/index bookmarks retained queries/hashes at root and under `/nextchapter/`. Geometry checks now wait for header transitions.
- Sidebar: both themes, desktop and 390px stacked layout without horizontal overflow; automatic status/badge/history updates and reload persistence passed with synthetic data. Radius checks confirmed equal token-derived outer detail panels/board columns, 8px prospect cards/inline Alerts and all four Builder card shells in dark/light themes. Preview-shell computed styles were inspected without generating application documents. Typecheck/lint and whitespace checks passed after the final style changes; the full Node suite was not rerun for those styling-only edits.
- Root landing: Pages run `38625829266` succeeded; published root and Tracker destination returned 200, and the served redirect script resolved to the board. Latest Pages run `38646760487` also succeeded. Latest styling has local browser acceptance; no separate post-deployment visual session is recorded.

From the repository root:

```sh
npm --prefix tools/prospect-tracker run typecheck
npm --prefix tools/prospect-tracker run lint
npm --prefix tools/prospect-tracker test
npm --prefix tools/prospect-tracker run functions:typecheck
npm --prefix tools/prospect-tracker run functions:lint
npm --prefix tools/prospect-tracker run test:functions
tools/prospect-tracker/node_modules/.bin/eslint \
  --config tools/prospect-tracker/eslint.config.js \
  tools/shared/navigation.mjs tools/shared/navigation-return.mjs
git diff --check
```

The reusable navigation browser script needs the disposable fixture and an isolated Chrome profile. Start these in separate terminals, using an unused temporary profile:

```sh
node tools/prospect-tracker/tests/fixtures/radar-server.js
```

```sh
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --headless=new --remote-debugging-port=9229 \
  --user-data-dir=/private/tmp/nextchapter-handoff-chrome \
  --no-first-run --no-default-browser-check about:blank
```

```sh
node tools/prospect-tracker/tests/browser/navigation.mjs
```

The fixture listens on 8777 and uses synthetic Auth/data with the actual schema/RLS/triggers. Navigation checks use `/nextchapter/tools/`; older browser checks also exercise `/career-context/tools/`. Tests block hosted auth/context/generation requests and allow fonts. Stop disposable services afterward. Do not use production credentials in that fixture. Some sidebar/ingestion acceptance was performed interactively; the navigation script alone does not reproduce it. Browser screenshots and temporary research scripts were stored outside the repository, not as durable test artifacts.

## Remaining checks and boundaries

- Authenticated hosted Workable retrieval/preview/Cancel across two employers and existing-provider/manual-entry regression acceptance remain unrecorded. Do not create disposable production prospects; keep private before/after snapshots outside this public repository. See [the Workable guide](prospect-tracker-workable-ingestion.md#deployment-and-hosted-acceptance).
- Complete Workable's local Open existing confirmation and Save separately browser acceptance if revisiting its UI; deterministic identity/persistence coverage does not replace those checks.
- Broader hosted guarded-write acceptance, screen-reader sessions, full WCAG conformance and refresh-token endurance remain outside completed validation. Provider-specific gaps remain in their guides.
- Builder generation/prompts, résumé document/export formatting and handoff payloads were not changed by the recent sidebar/radius work. Preserve full saved descriptions and unrelated Builder drafts/settings during handoff. Canonical career facts/writing policy stay in their authoritative files; opportunity records and operator secrets stay outside this public repository.
- Treat [the Radar product spec](career-radar/product.md) as planned work, not shipped functionality or blanket implementation authorization. Continue only with the user's next requested task.
