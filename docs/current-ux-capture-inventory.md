# Current UX capture inventory

Prepared October 8, 2026 for the [Career Radar Figma file](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=0-1).

The source-derived baseline is complete in Figma: **158 editable audit frames** covering 18 Builder desktop states, 42 Radar desktop states and 19 representative mobile views, each in dark and light themes. This is capture coverage, not a completed UX audit or end-to-end acceptance test. The connected account is `larry.jr.design@gmail.com`.

Start with the [capture guide](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=20-2). The desktop pages place dark and light variants side by side; mobile groups both apps by theme. Each frame has a state ID and an audit-only banner identifying its source.

| Figma page | Coverage |
| --- | --- |
| [Builder desktop](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=4-3) | 36 frames, 1440 px |
| [Radar desktop](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=4-4) | 84 frames, 1440 px |
| [Mobile, both apps](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=4-5) | 38 frames, 390 px |

### Method and limits

Disposable fixture pages outside the repository use the apps' existing markup, styles and rendering functions. Radar records and posting responses are synthetic; Builder documents are labeled audit samples. No hosted prospects were read or changed to manufacture a state, and no generation or export operation was exercised against production services.

**Renderer fixture** means the application renderer produced the view with supplied sample data. **Source reconstruction** means transient feedback or browser-native dialog text was assembled from the relevant code. Browser-native alerts, validation and confirmations are annotations; their operating-system appearance is not captured. Gold banners belong to the audit, not the application.

Builder uses editable browser-converted layers. Radar uses editable layers recreated from rendered DOM geometry and computed styles after the desktop conversion jobs stalled. Mobile fixture containers apply the source's responsive rules at 390 px; they are source-derived layouts, not evidence from a physical phone. Native form controls are approximated, including select arrows and date fields; browser-specific picker icons and input behavior are not reproduced. Builder's theme icon uses Material Icons Regular because the Outlined face was unavailable in Figma.

The frames preserve current colors, typography, content hierarchy and layout. Fixed source geometry does not establish reusable or responsive components. Existing component references on page 99 were retained. Tokens, production UI and deployment were not changed.

Representative desktop and mobile previews, populated boards, duplicate review, saved details/history and confirmation annotations were visually checked. Conversion errors involving font rendering, selected options, dates and hidden disclosure content were corrected. Frame counts and editable text were recorded. Full flow behavior, live authentication, retrieval, save conflicts and generated exports remain separate validation work.

## Capture conventions

- Preserve the current implementation as an audit baseline before redesigning it.
- Capture each listed state in dark and light themes. Use a consistent desktop width of 1440 px; include representative mobile views at 390 px for each distinct layout and any responsive failure.
- Use editable Figma layers for application UI, with named frames grouped by application and flow. Screenshots may be used as visual references, not as the completed UI.
- Use synthetic opportunity records for Radar and clearly labeled sample application content for Builder. Do not modify hosted prospects to manufacture states. Do not present sample text as canonical career facts or generated applications ready to send.
- Record transient feedback next to its parent view. Browser-native alerts, validation bubbles and confirmation dialogs should be labeled as browser UI rather than redesigned application components.
- Record the triggering action and whether each capture is live, fixture-driven or a source reconstruction. A reconstructed state is not evidence that the full flow was exercised.
- Token changes, component creation and application implementation are subsequent work; the baseline should show today's UI.

## Resume Builder

Source: [resume-tailor.html](../tools/resume-tailor.html).

| ID | View / state | Trigger or distinction |
| --- | --- | --- |
| B01 | Empty job details | Context loaded, emphasis options visible |
| B02 | Filled job details | Optional contact, notes and selected emphasis chips |
| B03 | Required-field alert | Generate without a job title or description; browser-native alert |
| B04 | Context loading | First generation fetches canonical context from GitHub |
| B05 | Context loading failure | Loading pane with failure text; inspect recovery affordances |
| B06 | Generation in progress | Starting, thinking, content stages and rendering; representative frame plus stage labels |
| B07 | Automatic repair in progress | Rule violation repair feedback |
| B08 | Generation failure | Error text and Start Over action; API, stream, truncation and parsing errors share this layout |
| B09 | Resume preview | Tailoring note, summary, skills, experience, education and download/revision controls |
| B10 | Preview with QA warnings | Check before sending callout |
| B11 | Cover-letter preview | Active Cover Letter tab and complete letter layout |
| B12 | Revision in progress | Resume and cover-letter status text; disabled revision button |
| B13 | Revised resume | Revision summary and highlighted changed content |
| B14 | Revised cover letter | Paragraph highlights and revision summary |
| B15 | Revision failure | Transient failure feedback with previous preview preserved |
| B16 | Download in progress | Disabled Download Package button with library/build/zip stages |
| B17 | Download failure | Browser-native alert, restored download control |
| B18 | Start new application | Cleared input form and reset emphasis selection |

Mobile coverage: job details, generation/error pane, resume preview, cover-letter preview and revision/download controls. Preview captures should include the whole rendered document, not only the first viewport.

## Career Radar

Sources: [index.html](../tools/career-radar/index.html), [ui.js](../tools/career-radar/ui.js), [app.js](../tools/career-radar/app.js), [ingestion-ui.js](../tools/career-radar/ingestion-ui.js), [bootstrap.js](../tools/career-radar/bootstrap.js).

| ID | View / state | Trigger or distinction |
| --- | --- | --- |
| R01 | Sign in | Empty email/password form |
| R02 | Sign-in pending / failure | Disabled submission and login error |
| R03 | Initial connection / setup failure | Connecting message; configuration/connection failure with Reload |
| R04 | Board loading / failure | Loading prospects; failure with Try again |
| R05 | Empty board | Empty lifecycle columns and Add your first prospect |
| R06 | Populated board | Representative cards in every lifecycle group, including applied dates |
| R07 | Applied expanded | Show all / Show fewer behavior above the current card limit |
| R08 | Done expanded | Collapsed versus expanded completed group |
| R09 | Add prospect | Import panel and blank manual-entry form |
| R10 | Add prospect with more details | Expanded fields, discovery source hint, dates and description |
| R11 | Required / invalid field | Native company/title/URL validation and application validation feedback |
| R12 | Retrieval pending | Retrieving posting, disabled controls and Cancel |
| R13 | Retrieved posting preview | Editable extracted fields, origins, provider identity and no-duplicate feedback |
| R14 | Incomplete posting preview | Missing-field origins and retrieval warnings |
| R15 | Edited posting preview | Edited by you origin feedback |
| R16 | Likely duplicates | Existing prospect links, reasons and Save separately decision |
| R17 | Retrieval failure / cancellation | Preserved draft, manual-entry fallback; unsupported, unavailable and timed-out retrievals |
| R18 | Create pending / failure | Adding prospect; preserved draft on save failure |
| R19 | Saved prospect | Existing details, posting link, status controls and status history |
| R20 | Saved prospect with more details | Expanded saved fields and full job description |
| R21 | Details save pending / success / failure | Independent details-save feedback and preserved failed draft |
| R22 | Status save pending / success / unchanged | Separate status controls, Status saved and Already at this status |
| R23 | History loading / empty / failure | History region with retry where applicable |
| R24 | Stale edit conflict | Preserved draft and Reload saved prospect action |
| R25 | Expired session | Sign-in prompt while draft is retained |
| R26 | Navigation / replacement confirmations | Native unsaved-change, retrieved-facts replacement and stale-reload dialogs |
| R27 | Missing prospect / unknown route | Not-found messages with board navigation |
| R28 | Sign-out failure | Header notice |

Mobile coverage: sign in, empty/populated board (including horizontal scroll), add/import form, duplicate review and existing prospect with status/history. Capture long editor views in full.

The existing [disposable Radar fixture](../tools/career-radar/tests/fixtures/radar-server.js) can supply synthetic auth, posting retrieval and save failures without hosted writes. Check shared stylesheet serving before using it for fidelity captures; its existing path restrictions do not serve the sibling shared-token stylesheet.

## Baseline foundations

The apps share [tokens.css](../tools/shared/tokens.css), with Readex Pro for application text and Crimson Pro for serif text. Local aliases and component CSS remain application-specific. Capture current resolved styles before proposing changes; [shared-design-tokens.md](shared-design-tokens.md) defines the existing boundaries.

Record any UX findings separately from the baseline: issue, affected state IDs, evidence, proposed fix and implementation status. Discovery and assessment workflows are absent and should not be represented as existing views.

## Completed frame index

The suffixed Radar IDs split combined checklist rows into distinct feedback states. Mobile includes representative layouts; all desktop states are indexed below.

### Builder desktop

| State | View | Dark | Light |
| --- | --- | --- | --- |
| B01 | Empty job details | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-1684) |
| B02 | Filled job details | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-106) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-1788) |
| B03 | Required-field alert | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-210) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-1892) |
| B04 | Context loading | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-320) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2002) |
| B05 | Context failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-352) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2034) |
| B06 | Generating | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-384) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2066) |
| B07 | Automatic repair | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-416) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2098) |
| B08 | Generation failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-448) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2130) |
| B09 | Resume preview | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-483) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2165) |
| B10 | QA warnings | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-614) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2296) |
| B11 | Cover letter preview | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-748) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2430) |
| B12 | Revision pending | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-822) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2504) |
| B13 | Revised resume | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-958) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2640) |
| B14 | Revised cover letter | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-1097) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2779) |
| B15 | Revision failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-1176) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2858) |
| B16 | Download pending | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-1312) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-2994) |
| B17 | Download failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-1443) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-3125) |
| B18 | Start new application | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-1580) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=5-3262) |

### Radar desktop

| State | View | Dark | Light |
| --- | --- | --- | --- |
| R01 | Sign in | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3553) |
| R02a | Sign-in pending | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-35) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3586) |
| R02b | Sign-in failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-68) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3619) |
| R03a | Connecting | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-103) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3654) |
| R03b | Setup failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-125) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3676) |
| R04a | Board loading | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-153) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3704) |
| R04b | Board failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-180) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3731) |
| R05 | Empty board | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-209) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3760) |
| R06 | Populated board | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-279) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3830) |
| R07 | Applied expanded | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-489) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-4040) |
| R08 | Done expanded | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-713) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-4264) |
| R09 | Add prospect | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-937) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-4488) |
| R10 | More job details | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1000) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-4551) |
| R11 | Invalid URL | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1096) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-4647) |
| R12 | Retrieving posting | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1164) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-4715) |
| R13 | Retrieved posting preview | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1230) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-4781) |
| R14 | Missing posting fields | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1364) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-4915) |
| R15 | Edited posting preview | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1501) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5052) |
| R16 | Likely duplicates | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1639) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5190) |
| R17a | Retrieval failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1782) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5333) |
| R17b | Retrieval canceled | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1848) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5399) |
| R18a | Create pending | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1914) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5465) |
| R18b | Create failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-1979) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5530) |
| R19 | Saved prospect | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2045) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5596) |
| R20 | Saved details expanded | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2133) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5684) |
| R21a | Details save pending | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2260) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5811) |
| R21b | Details save success | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2348) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5899) |
| R21c | Details save failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2436) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-5987) |
| R22a | Status pending | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2524) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6075) |
| R22b | Status saved | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2612) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6163) |
| R22c | Status unchanged | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2700) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6251) |
| R23a | History loading | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2788) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6339) |
| R23b | History empty | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2862) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6413) |
| R23c | History failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-2937) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6488) |
| R24 | Stale edit conflict | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3013) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6564) |
| R25 | Expired session | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3103) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6654) |
| R26a | Confirmation dialog | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3138) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6689) |
| R26b | Confirmation dialog | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3229) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6780) |
| R26c | Confirmation dialog | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3320) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6871) |
| R27a | Missing prospect | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3411) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6962) |
| R27b | Unknown route | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3438) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-6989) |
| R28 | Sign-out failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-3465) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=22-7016) |

### Mobile

| State | View | Dark | Light |
| --- | --- | --- | --- |
| B01 | Empty job details | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-4496) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5397) |
| B02 | Filled job details | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-4598) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5499) |
| B05 | Context failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-4700) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5601) |
| B06 | Generating | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-4731) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5632) |
| B08 | Generation failure | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-4762) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5663) |
| B09 | Resume preview | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-4796) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5697) |
| B11 | Cover letter preview | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-4925) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5826) |
| B12 | Revision pending | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-4997) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5898) |
| B13 | Revised resume | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5131) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-6032) |
| B16 | Download pending | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-5268) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=18-6169) |
| R01 | Sign in | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-2) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-966) |
| R05 | Empty board | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-35) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-999) |
| R06 | Populated board | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-105) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-1069) |
| R09 | Add prospect | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-315) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-1279) |
| R10 | More job details | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-378) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-1342) |
| R13 | Retrieved posting preview | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-474) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-1438) |
| R16 | Likely duplicates | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-608) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-1572) |
| R19 | Saved prospect | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-751) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-1715) |
| R20 | Saved details expanded | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-839) | [Open](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=23-1803) |
