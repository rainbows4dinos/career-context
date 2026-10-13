# Claude Code handoff — nextchapter

Prepared October 12, 2026. Implementation baseline: `f43e811` on `main`, pushed to `origin/main`. This handoff and the accompanying README update are documentation changes made after that commit. GitHub Pages deployment completion was not checked during this handoff.

## Start here

Read [AGENTS.md](../AGENTS.md) before editing, then inspect the current working tree. [CLAUDE.md](../CLAUDE.md) imports those instructions; it does not own a separate policy. This document records implementation state, not authorization for additional features. Continue only with the user's next requested task.

nextchapter is the product and repository name (renamed from `career-context`; Pages is served under `/nextchapter/`). Preserve the existing URLs and static GitHub Pages deployment. Career Radar is a coming-soon page, while Prospect Tracker is the existing authenticated tracking application at `tools/career-radar/`.

## Completed implementation

| Area | Current implementation / reference |
| --- | --- |
| Shared foundations | Color/theme/typography tokens in [tokens.css](../tools/shared/tokens.css); global border-box sizing. See [Phase 1](nextchapter-shared-foundations-phase1.md). |
| Actions | Native buttons, keyboard chips and pill tabs, Step Progress Item and composed Indicator. See [Phase 2A](nextchapter-actions-phase2a.md). |
| Inputs and Status | Native labeled fields, validation associations, Alerts, Toasts and Spinner. See [Phase 2B](nextchapter-inputs-status-phase2b.md). |
| Navigation and About | Responsive suite header, theme switch, About page and global account controls. See [Phase 2C](nextchapter-navigation.md). |

The earlier [component audit](component-system-audit.md) and [APCA reevaluation](apca-contrast-reevaluation.md) describe historical inspection baselines. Later Figma corrections and implementation reports supersede specific old findings. Re-read live Figma for a new design change rather than treating an old audit table as the current specification. No full accessibility-conformance claim has been made.

## Latest navigation behavior and files

- [navigation.mjs](../tools/shared/navigation.mjs) and [navigation.css](../tools/shared/navigation.css) render the shared header on Career Radar, Prospect Tracker, Résumé Builder and About. Large starts at 1200px, Medium at 900px, and Small is below 900px. Large shows utility links directly; Medium uses an ellipsis popover; Small expands navigation in document flow.
- The Medium popover contains About and session-aware Log In/Log Out. Its icon button is 28px with a 12px glyph; the panel is 180px wide with 12px padding/gap and a 16px radius. It supports Escape/focus return, outside clicks, focus-leave dismissal and responsive reset. It uses native links/buttons without modal or ARIA menu semantics.
- Two real-pointer bugs were fixed: outside-click detection uses `event.composedPath()` because opening replaces the SVG icon; inside pointer presses suppress focus dismissal until release because macOS browsers can blur a link without focusing the clicked account button. Preserve these protections when changing menu behavior. Programmatic `.click()` alone did not catch these failures.
- The switch is 48×28 with a 20px thumb, vertically centered using `top:50%` and half-height translation. Global border-box keeps specified outer dimensions unchanged. Default Dark, `body.light`, guarded `localStorage.theme`, cross-tab theme changes and reduced-motion behavior remain intact.
- [supabase-client.js](../tools/career-radar/supabase-client.js) exposes `getRadarClient()`, a cached initialization promise shared by Tracker bootstrap and the header within each page. Public pages initialize authentication only, without Tracker's prospect data layer. Each tab has its own SDK client; existing SDK session persistence/refresh and cross-tab events remain in use.
- [navigation-return.mjs](../tools/shared/navigation-return.mjs) accepts only same-origin suite entry paths, preserving queries/hashes and removing nested `returnTo` values. Login on Tracker focuses its existing form; login elsewhere navigates to Tracker and returns after authentication. Logout stays on the current page. Tracker retains its dirty-editor confirmation, pending-write guard and protected-UI clearing.
- [about.html](../tools/about.html) is a public README-based introduction. The header does not gate public Builder/About/Radar content when account configuration is unavailable; the account action offers Retry account.

Latest Figma references: [Navigation and utility menu](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=92-9370), [Menu Icon Button](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=125-12791), and [Switch Mode](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=81-397). The last implementation inspection was October 12; this documentation task did not re-query Figma.

## Validation and reproduction

The latest navigation browser run passed on all four pages in both themes at 1512/1200/1080/900/899/390/320px. Real pointer-driven About and login/return/logout passed from every page in Large/Medium/Small layouts. Checks also covered keyboard activation/Escape, outside-click/focus dismissal, safe returns, failed login, persisted sessions, cross-tab sign-out/theme changes, dirty-editor logout protection and reduced motion. Synthetic prospect/history/write counters remained unchanged.

All 88 scoped Node tests passed before the final pointer-handler fixes; browser acceptance, Tracker type-check/lint and shared navigation lint passed after those fixes. Earlier phase reports record generation, revision, export, ingestion and complete-description handoff regressions. Some of those checks used temporary scripts outside the repository; do not assume all can be reproduced by the navigation test alone. No hosted records or live generation requests were used in navigation acceptance.

Run from the repository root:

```sh
npm --prefix tools/career-radar run typecheck
npm --prefix tools/career-radar run lint
npm --prefix tools/career-radar test
tools/career-radar/node_modules/.bin/eslint \
  --config tools/career-radar/eslint.config.js tools/shared/navigation.mjs
git diff --check
```

Browser acceptance requires the disposable fixture and an isolated Chrome profile. Start each long-running service in a separate terminal; use an unused temporary profile and debugging port 9229:

```sh
node tools/career-radar/tests/fixtures/radar-server.js
```

```sh
# macOS, separate terminal:
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --headless=new --remote-debugging-port=9229 \
  --user-data-dir=/private/tmp/nextchapter-handoff-chrome \
  --no-first-run --no-default-browser-check about:blank
```

```sh
# Third terminal, after both services are ready:
node tools/career-radar/tests/browser/navigation.mjs
```

The fixture listens on 8777 and supplies only a synthetic account/data store. The test uses a GitHub Pages-style `/career-context/tools/` prefix, blocks hosted auth/context/generation requests and allows font requests. It creates/closes its own tabs and saves screenshots outside the repository. Stop the disposable services afterward. Do not use a personal browser profile or production credentials. Restricted environments may require permission to bind localhost for fixture-based tests. Dependencies remain scoped to `tools/career-radar/`; no new test framework is needed.

## Boundaries and remaining work

The latest phase changed navigation/auth UI and shared sizing, not Builder generation/prompts, document previews, export formatting, job-handoff payloads, Tracker ingestion, database schema or status-history rules. Preserve full descriptions and unrelated Builder drafts/settings during handoff. Opportunity records and operator secrets must remain outside this public repository.

Public authentication relies on Tracker's existing browser-safe configuration and committed SDK import maps. Missing configuration leaves public pages usable and Tracker unavailable. The static site, Anthropic proxy Worker and Supabase ingestion function deploy separately; this phase did not deploy the Worker or function, apply migrations, or rename the repository.

There is no assigned follow-up implementation task. Screen-reader sessions, full WCAG conformance, refresh-token expiry endurance and production deployment acceptance remain unverified. Any repository rename requires the separate [readiness/cutover plan](nextchapter-repository-rename.md) and explicit authorization. Keep future work scoped to the next user request.
