# Résumé Builder preview and download layout

The [Figma preview refactor](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=149-15109) defines the desktop, tablet, mobile, and generation-state references. The implementation remains in `tools/resume-tailor.html` and reuses shared buttons, tabs, fields, Alerts, typography tokens, and Gravity icons.

Job Details and Generating retain an 800px content area. Only the successful Preview + Download step expands to a maximum 1400px content area. At 1200px and above, the document occupies the flexible left column beside a 380px sidebar, separated by 28px. Below that breakpoint the sidebar follows the document. Mobile actions stack; résumé role/date headers can wrap without changing document text or export formatting.

The document tabs remain above the preview. Download and Start New Application appear inside the document card below the current document. Generation Status displays the actual tailoring explanation and existing revision summary using shared Alerts. Quality Checks renders each unchanged `qaWarnings()` result as an individual warning Alert, or a muted empty state. Request Changes retains the existing textarea, keyboard submission, revision status, error handling, and revision handler, with an Apply Changes button.

The existing generation response structure, Prospect Tracker handoff and package workflow remain intact. The download handler restores its original label spans and icon after loading or failure. Document facts and revision context are supplied as described below.

## Context facts

`tools/shared/resume-context.mjs` reads fixed document facts from the fetched `resume-master.md`: Contact identity/headline/location/links, Education entries, all Certifications entries, and employer/title/date metadata in Experience. The Contact block retains its name, headline, location, HTTPS links, email and phone structure; each education/certification uses a level-two heading followed by its institution. Experience employer headings and their following title/date lines sit between the Experience and Additional Experience headings. Missing required facts produce a context error rather than stale personal defaults.

Preview, cover-letter signature, formatted PDF/DOCX, ATS DOCX, portfolio link and document filenames consume that parsed context. Both current certifications are included. The generic Bachelor of Science abbreviation remains a presentation rule. Role locations come from `rules.json`; absent entries no longer imply Remote. Generated summaries, skill selections, bullets and letter prose still use the model's tailored response based on the context files. Both revision prompts now include the master résumé and experience framing. After generation or résumé revision, canonical employer/title/date metadata is restored while tailored bullets are preserved; unknown, duplicated or missing employers surface an error.

Context is still fetched from GitHub `main` and retained for the page session. Local canonical-file changes require a push and page reload. The parser and renderers contain no personal résumé facts.

Context-fact validation used an altered synthetic master with changed identity, contact information, degree, both certifications and a role title/date range. Local Chrome generation, résumé/cover-letter revisions, preview and package downloads picked up those values. Both PDFs were inspected visually and by text; all three DOCX contents were checked structurally, including hyperlinks. DOCX visual rendering was not performed. Five context regression tests plus the existing suite pass (100 tests total), along with scoped typecheck, lint, inline-script parsing and diff checks.

## Validation

- Compared local Chrome desktop layout against Figma at 1512px: 992px document column, 380px sidebar, and 28px gap. Checked both themes.
- Checked 1024px tablet and 390px mobile stacking with no page-level horizontal overflow, and submitted a revision from mobile controls.
- Used synthetic generation responses to verify initial/generating width, successful expansion, generation failure/retry, separate warnings, tailoring text outside the document, both document tabs, keyboard tab navigation, résumé and cover-letter revisions, loading states, failed revision draft retention, and successful draft clearing.
- Verified a simulated package failure followed by a successful real ZIP download. The ZIP passed its integrity check and contained both PDFs, both formatted DOCX files, the ATS DOCX, and README.
- Inline scripts parse successfully. Scoped typecheck, lint, all 100 Node tests, and `git diff --check` pass.

Browser acceptance used local synthetic responses without calling the live generation service or changing hosted prospect records. Real mobile devices and other browser engines were not tested. The context-fact export checks and their visual-validation limits are recorded above.
