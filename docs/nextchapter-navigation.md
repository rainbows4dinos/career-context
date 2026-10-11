# nextchapter navigation

nextchapter is the parent suite. Its shared header links three distinct experiences:

| Application | Static destination | Responsibility |
| --- | --- | --- |
| Career Radar | `tools/career-radar.html` | Coming soon: discover and evaluate opportunities |
| Prospect Tracker | `tools/career-radar/` | Existing tracking, status/history, posting ingestion and Builder handoff |
| Résumé Builder | `tools/resume-tailor.html` | Existing generation, previews, revisions and downloads |

The wordmark opens Prospect Tracker. Existing tracker hash routes, including `#/board`, `#/prospects/new` and `#/prospects/<id>`, and Builder URLs remain unchanged. The file/folder distinction preserves all existing tracker bookmarks without redirects. Paths work beneath the current Pages prefix and at a local static server root.

## Shared implementation

Each page includes `shared/navigation.css` and `shared/navigation.mjs` using its relative path, plus one header with a `data-app` value. The module renders the wordmark, semantic navigation, active `aria-current="page"` link and theme button once. Destinations resolve relative to the module URL, so they also adapt to a future Pages repository prefix. There is no build step, routing library or shared application state.

Builder’s original 52×28 theme track, 20px thumb, Material sun/moon icons, transitions and dark/light positions were extracted into the shared stylesheet. Its body-class toggle, default dark theme, guarded storage access and existing `theme` key are now used by all three pages. The former clickable div is a native button with an action label, pressed state and focus outline. Preferences persist on the same origin, and storage events update already-open apps. If storage is unavailable, the switch still works on the current page. Material icons retain Builder’s existing Google Fonts dependency.

Tracker’s former theme text button and Builder’s duplicate theme logic were removed. App-specific styles, legacy token aliases and document styles remain local. The placeholder reuses Tracker’s existing page/panel styles. These are temporary foundations for the later design-system audit, not new tokens or a component library.

## Rename boundaries

Visible tracker titles, login/setup messaging, discovered-date hints and handoff feedback now say Prospect Tracker. Board/Add prospect/Sign out remain in the local tracker header with their existing IDs and behavior. Unsaved-change navigation guards continue to handle shared links.

The existing `career-radar` directory, npm package, function names, Supabase configuration/resources, ingestion metadata contracts, schema, auth storage and handoff identifiers remain unchanged. Adapter metadata can retain its historical Career Radar wording; the UI presents the current product name. Existing ingestion stays in Prospect Tracker. The new placeholder makes no API or database requests.

## Validation

Local checks: 86 Node tests and 5 Deno tests passed, plus scoped lint/type checks and a strict JavaScript type check of the shared navigation module. Vendor/icon consistency checks run in the existing suite. `git diff --check` passed.

Isolated Chrome validation under `/career-context/tools/` exercised all three destinations, active links and reloads, the wordmark destination, native Enter/Tab behavior and focus outline, 390px mobile wrapping, desktop layouts, dark/light states, navigation persistence and cross-tab theme synchronization. Screenshots were inspected locally. Fonts/icons loaded using their existing external providers.

Tracker browser validation used a disposable migration-backed local fixture: password sign-in/sign-out, existing detail deep-link reload, editing, status transition/history, board, Greenhouse preview/save, duplicate detection and cancel. The existing suite covers the other ATS adapters and authorization/data regressions. Header/theme navigation added no database writes; explicit synthetic edits/status changes/saves used the existing data layer.

Handoff browser regression covered the real detail action, exact long descriptions, repeated sends, existing Builder drafts, replacement confirmation, malformed/missing/expired transfers, blocked storage/popups, standalone Builder loading and no handoff-related database writes.

Builder browser checks used mocked API responses to exercise input, streamed generation, résumé/cover-letter previews and revision. Its real CDN export libraries produced a ZIP containing two PDFs, three DOCX files and a README; archive/document structure was checked. Source comparison confirms configuration, context loading, generation, previews, revisions and export code are unchanged. Live Anthropic generation, hosted Supabase data and deployed Pages were not exercised; no production data or migrations were touched.

Repository rename is separate. See [rename readiness and cutover sequence](nextchapter-repository-rename.md).
