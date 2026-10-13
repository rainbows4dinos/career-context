# nextchapter global navigation and About

Phase 2C extends `tools/shared/navigation.mjs` and `navigation.css` across the suite. The wordmark still opens Prospect Tracker; the four native navigation links resolve relative to the module, including GitHub Pages project prefixes.

| Destination | Static path | Responsibility |
| --- | --- | --- |
| Career Radar | `tools/career-radar.html` | Future discovery/evaluation; remains a public placeholder |
| Prospect Tracker | `tools/career-radar/` | Authenticated prospect/application tracking, posting previews and Builder handoff |
| Résumé Builder | `tools/resume-tailor.html` | Public generation, revision, previews and downloads |
| About | `tools/about.html` | Public README-based introduction to the tools and their shared context |

Existing Tracker hashes and Builder URLs remain unchanged. The header sits before each application shell so its background spans the viewport. Shared `layout.css` applies a centered 1400px maximum outer content width, 28px side padding on desktop/tablet and 20px below 900px, matching the header’s mobile category. Inner reading/form panels retain their local width constraints.

## Shared navigation visual migration

Inspected live Figma Navigation `92:9370`, MainNavItem `92:9731`, and Main Navigation Header `125:12294`, including screenshots and high-fidelity context for Large `92:3421`, Medium `92:9721`, Small `102:10498`, and Small-Open `125:12462` on October 12, 2026. Also inspected Menu Icon Button `125:12791` (Primary/Tertiary Default, Hover and Pressed) and More Menu Example `125:12838`.

The header uses `action/secondary/bg` and `action/secondary/fg`, a one-pixel `border/control` bottom rule, Regular DM Serif Display wordmark, and Inter Medium 16px/16px links. Default links are transparent; Hover adds the Primary border; current links use Primary fill/border/foreground and `aria-current="page"`. Focus retains the shared 2px ring/2px offset. There are no new colors or color-token changes.

Large has an 80px header, maximum 1400px content container, 28px horizontal padding, 28px wordmark and 40px primary-link gaps. Medium keeps 80px height and full available container width within the shared 1400px maximum, a 28px wordmark, 12px link gaps and an ellipsis disclosure for About/account; theme remains visible. Small has a 64px outer header (including its one-pixel bottom rule), a 28px/36px wordmark, 20px padding and a 28px native menu button. Actual fit checks use Large from 1200px, Medium from 900px, and Small below 900px rather than treating specimen widths as breakpoints.

The existing theme behavior remains default Dark, `body.light`, guarded `localStorage.theme` persistence and cross-tab storage events. Switch-Mode now uses the Figma 48×28 track, 20px thumb and existing Gravity moon/sun icons at 12px. Light uses Primary fill/border/thumb; Dark uses Secondary fill/border/thumb, preserving the preceding color correction. Thumb and icons use `top:50%` with a half-height translation, matching Figma’s center constraints without hand-adjusted border offsets. The shared foundation applies `box-sizing:border-box` to all elements and pseudo-elements across the suite; borders and padding stay within specified outer dimensions. Duplicate app-level sizing resets were removed. Motion respects reduced-motion preferences.

## Mobile navigation behavior

A native disclosure button exposes `aria-expanded`, `aria-controls` and an action label. It precedes the disclosed links in DOM order so Tab enters navigation after opening. Escape closes and returns focus to the toggle; link activation closes after the existing Tracker unsaved-change guard. Changing responsive categories resets the disclosure and moves focus out of hidden controls. Medium opens a 180px utility popover containing About and the session-aware Log In/Log Out action. Its internal item right edges align with the More toggle; the panel extends 13px farther right to account for its 12px padding and 1px border. It uses 12px padding/gap, a 16px radius, Secondary background, Control border and a 1px border-colored shadow. The popover utility links use the same Small MainNavItem Default/Hover/Selected styling as mobile navigation, including 6px state corners and 4px/6px label insets. The 28px Tertiary icon button keeps its 12px ellipsis while open; Small uses the Primary icon-button states. Opening the medium popover focuses About; Escape returns focus to the toggle. Clicking outside the panel (including elsewhere in the header) or tabbing away dismisses it without moving focus. Outside-click detection uses the original composed event path so replacing the ellipsis SVG cannot dismiss its own opening click. Inside pointer presses suppress focus dismissal until release, preserving native account-button clicks on macOS browsers that blur links without focusing buttons.

Small MainNavItem Hover/Selected use 6px corners and the existing Primary stroke; Selected retains Primary fill. Default/Hover label insets are 4px, Selected insets are 6px, and all states remain 32px high with Secondary foreground. CSS padding accounts for the inside 1px stroke; no negative utility-item margins remain on mobile.

Small-Open retains Figma's right-aligned links, 24px gaps, utility divider, About/account and theme controls, lavender background and viewport-height panel. It expands **in the document flow**, pushing application content below it. No modal overlay, focus trap, menu roles or interactive content hidden behind an overlay are introduced.

## Global authentication integration

`getRadarClient()` in the existing `tools/career-radar/supabase-client.js` caches the initialization promise. Tracker bootstrap and the shared header reuse that client within a page; existing public configuration, SDK, storage identity, session persistence and refresh settings remain unchanged. Public entry points add the same vendored SDK import map. Each page/tab has its own client as usual; the SDK propagates account changes across tabs.

The header renders before asynchronous account initialization. Only the account action shows a disabled “Account…” loading state. Its resolved label is “Log In” or “Log Out”; an initialization error offers “Retry account” with configuration/connection guidance. Public Builder/About/Radar still work when account configuration is missing. If a module download/configuration failed, a reload may be needed after fixing it because browsers cache failed module loads.

Log In on Tracker focuses its existing email field and preserves the current route. From another page it opens that same Tracker form with a `returnTo` query value. `navigation-return.mjs` validates origin, protocol, credentials and the suite's exact entry paths, preserves other queries/hashes, and removes nested return parameters. Tracker consumes/removes the parameter only once a session exists, including a session established in another tab. External or malformed destinations never redirect. No login modal or account management is added.

Log Out uses the existing `signOut({scope:'local'})` call and shows shared Toast feedback. It remains on the current page. Tracker retains its protected workspace/login presentation and deferred SDK callbacks, clears protected UI on `SIGNED_OUT`, guards pending writes through the shared account busy state, and retains its existing unsaved-change confirmation through a cancellable `nextchapter:before-sign-out` event. The redundant Tracker-only Sign out button/styles/listener are removed; Board/Add prospect and the credential form remain.

No public page initializes Tracker's data layer or reads prospects. Career Radar remains a placeholder. Authentication does not gate Builder or About. No schema, ingestion, duplicate matching, persistence, generation, revision, handoff or export logic changed.

## About page and adoption

`tools/about.html` uses shared navigation, typography, color/surface tokens, existing panel styles and shared components. Its 720px reading width introduces nextchapter, the three tools, the existing handoff, and separate canonical context/opportunity records. README is the primary content source; current code verifies the described handoff. Future Radar functionality is explicitly unavailable. No new marketing assets or animations are added.

## Validation

Reproduction uses an isolated Chrome profile with remote debugging on port 9229 and the disposable synthetic fixture on port 8777:

```sh
node tools/career-radar/tests/fixtures/radar-server.js
node tools/career-radar/tests/browser/navigation.mjs
node tools/career-radar/tests/browser/inputs-status.mjs
npm --prefix tools/career-radar run typecheck
npm --prefix tools/career-radar run lint
npm --prefix tools/career-radar test
```

Content-container verification also passed on all four pages in both themes at 1920/1512/1400/1200/1080/900/899/600/390/320px: 1400px maximum outer width, centered positioning, 28px/20px side padding, full-width header placement and no page-level horizontal overflow.

All 88 scoped Node tests, Tracker type-check/lint, shared navigation lint, token-reference/link checks and `git diff --check` passed.

The navigation acceptance test covers all four destinations, two themes, 1512/1200/1080/900/899/390/320px widths, current-state colors/weight, native keyboard disclosure activation, Escape/focus, resize reset, exact medium button/popover geometry, persistent ellipsis, outside-click/focus dismissal, medium utilities, actual mobile link navigation, default public/protected behavior, delayed/unavailable account initialization, real pointer-driven About navigation and login/return/logout from each page in Large/Medium/Small layouts, reload persistence, cross-tab sign-out/protected UI clearing, external redirect rejection, failed-login recovery, shared client identity, dirty-editor logout confirmation, cross-tab theme and reduced motion. It compares synthetic prospect/history/write counters before and after: navigation/account actions write nothing. Safe-return unit tests cover root/project prefixes, retained queries/hashes, nested returns, external/insecure/credentialed/executable/invalid/out-of-suite URLs.

Existing synthetic browser regressions exercise shared Inputs/Status, Tracker editing/status/history and posting/duplicate workflows, Builder generation/revision/error recovery and real export files, and full-description handoff. No hosted records, live Anthropic requests, production deployment or migrations are involved. Screenshots are stored outside the repository under `/private/tmp/nextchapter-navigation-*.png` and reviewed at Large/Medium/Small-Open in both themes. No screen-reader assistive-technology session or browser refresh-token expiry endurance test was performed; the existing SDK refresh configuration is preserved.

Repository rename remains separate: [readiness and cutover sequence](nextchapter-repository-rename.md).

## Files changed

- Shared sizing foundation: `tools/shared/tokens.css` (global border-box; token values unchanged).
- Shared visual/mobile/auth UI: `tools/shared/navigation.mjs`, `tools/shared/navigation.css`; safe return utility: `tools/shared/navigation-return.mjs`.
- Shared client and existing Tracker auth integration: `tools/career-radar/supabase-client.js`, `tools/career-radar/bootstrap.js`, `tools/career-radar/app.js`.
- Application adoption and redundant-control cleanup: `tools/career-radar/index.html`, `tools/career-radar/styles.css`, `tools/career-radar.html`, `tools/resume-tailor.html`.
- New public About page: `tools/about.html`.
- Synthetic validation: `tools/career-radar/tests/browser/navigation.mjs`, `tools/career-radar/tests/navigation-return.test.js`, `tools/career-radar/tests/fixtures/radar-server.js` (serves About).
- Documentation: `README.md`, `docs/nextchapter-navigation.md`.
