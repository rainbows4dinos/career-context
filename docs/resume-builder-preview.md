# Résumé Builder preview and download layout

The [Figma preview refactor](https://www.figma.com/design/hLBR7Nl3GelwM9hstQb3Ah/Career-Radar?node-id=149-15109) defines the desktop, tablet, mobile, and generation-state references. The implementation remains in `tools/resume-tailor.html` and reuses shared buttons, tabs, fields, Alerts, typography tokens, and Gravity icons.

Job Details and Generating retain an 800px content area. Only the successful Preview + Download step expands to a maximum 1400px content area. At 1200px and above, the document occupies the flexible left column beside a 380px sidebar, separated by 28px. Below that breakpoint the sidebar follows the document. Mobile actions stack; résumé role/date headers can wrap without changing document text or export formatting.

The document tabs remain above the preview. Download and Start New Application appear inside the document card below the current document. Generation Status displays the actual tailoring explanation and existing revision summary using shared Alerts. Quality Checks renders each unchanged `qaWarnings()` result as an individual warning Alert, or a muted empty state. Request Changes retains the existing textarea, keyboard submission, revision status, error handling, and revision handler, with an Apply Changes button.

Generation prompts, response structure, revision logic, Prospect Tracker handoff, and PDF/DOCX builders are unchanged. The download handler restores its original label spans and icon after loading or failure.

## Validation

- Compared local Chrome desktop layout against Figma at 1512px: 992px document column, 380px sidebar, and 28px gap. Checked both themes.
- Checked 1024px tablet and 390px mobile stacking with no page-level horizontal overflow, and submitted a revision from mobile controls.
- Used synthetic generation responses to verify initial/generating width, successful expansion, generation failure/retry, separate warnings, tailoring text outside the document, both document tabs, keyboard tab navigation, résumé and cover-letter revisions, loading states, failed revision draft retention, and successful draft clearing.
- Verified a simulated package failure followed by a successful real ZIP download. The ZIP passed its integrity check and contained both PDFs, both formatted DOCX files, the ATS DOCX, and README. Export builder function sources remain unchanged.
- Inline scripts parse successfully. Scoped typecheck, lint, all 95 existing Node tests, and `git diff --check` pass.

Browser acceptance used local synthetic responses without calling the live generation service or changing hosted prospect records. Real mobile devices and other browser engines were not tested. Export page layout was not revalidated because its builders and formatting did not change.
