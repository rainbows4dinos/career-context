# Repository Instructions

## Purpose and scope

This repository holds Larry Reynolds's canonical career context and personal career tools. The résumé and cover-letter builder remains a working tool. Career Radar supports manual prospect tracking, editing, status changes, history through Supabase, and editable job URL ingestion from Greenhouse, Ashby and Lever. Discovery and assessment workflows are not implemented yet.

This file is the tool-agnostic source of repository instructions. `CLAUDE.md` imports it for Claude Code. Keep shared development instructions here rather than duplicating them in tool-specific files.

## Sources and authority

- `resume-master.md`: career facts, roles, dates, capabilities, target roles, positioning, and scope boundaries.
- `experience-framing.md`: supporting stories, evidence, metrics, and interview framing. Read alongside the master résumé when interpreting experience.
- `voice-and-format.md`: authoritative writing policy for career communications, including résumé and cover-letter structure and editorial judgment. Where older tone notes overlap, use this file.
- `rules.json`: authoritative structured application-document constraints, including bullet caps, word limits, banned words, code-credit language, and role locations. Change countable rules here rather than duplicating values in prose or application code.
- `tone-and-positioning.md`: résumé UI emphasis options. Preserve the `## Emphasis Focus Options` heading and backtick-wrapped `value: Label` list format expected by the parser. This file is not the tone authority.
- `README.md`: human-facing project overview and consumption/deployment guidance.

Keep career facts and writing policy in their canonical files. This file directs development work; it is not a career-data source or a runtime generation prompt. Do not copy career histories or application policies into agent entry points.

Never invent career facts, metrics, or shipped outcomes. Respect role-specific scope notes, especially The Pattern's engagement boundaries. If sources disagree on a factual claim, surface the discrepancy rather than guessing. Keep generated applications and opportunity observations separate from canonical career facts.

## Existing architecture

- `tools/resume-tailor.html` is a standalone static application containing the UI, context loading, Claude prompts, streaming generation, revisions, QA warnings, and PDF/DOCX/ZIP exports.
- It fetches the five root context/configuration files above from `https://raw.githubusercontent.com/rainbows4dinos/career-context/main` at runtime. Local edits to those files do not affect the tool until pushed to `main`, even when the HTML is served locally.
- `tools/proxy-worker.js` is a Cloudflare Worker proxy for Anthropic requests. It supports streaming, restricts origins and models, and uses the `ANTHROPIC_API_KEY` secret. Its optional `TAILOR_KEY` is a shared-key speed bump, not user authentication.
- `tools/wrangler.toml` configures the Worker, deployed separately from the static site.
- `.github/workflows/pages.yml` publishes the repository root to GitHub Pages on pushes to `main` or manual dispatch. `.nojekyll` supports static serving.
- Résumé export libraries load from CDNs. The résumé builder has no package manifest, build system, or automated test suite. Its generated application data lives in browser memory; its local storage currently persists theme preference only.
- `tools/career-radar/` is a separate static page with hash routes, email/password login, a status board, prospect forms, and status history. Its scoped npm package supplies JavaScript checked with TypeScript/JSDoc, a typed Supabase client/data layer, environment-driven public configuration generation, and lint/tests. The browser uses an import map to the committed Supabase SDK in `vendor/`; regenerate and verify it with the scoped `vendor:generate` and `vendor:check` scripts when updating the SDK. Dependencies and tooling must remain scoped to Radar.
- `supabase/migrations/` defines the opportunity store: `prospects` with embedded connections and assessment columns, plus append-only `prospect_status_events`. RLS and database triggers enforce ownership and atomic status history. These files do not imply the migration has been applied to hosted Supabase.
- `docs/career-radar-v0.md` owns setup, schema, credential configuration, and validation guidance, including hosted setup status. Database types are generated from Supabase; regenerate after applying schema changes. Local migration-based PostgreSQL introspection remains a bootstrap option.
- `supabase/functions/job-ingest/` is Radar's separately deployed posting retrieval entry point (Greenhouse, Ashby and Lever deployed). Shared `tools/career-radar/ingestion/` modules have no UI/database writes and remain inside Radar's scoped package for Node/Deno validation. Only allowlisted Greenhouse, Ashby and Lever identities are retrieved; verified Supabase Auth plus a configured single-owner UUID gates access. Keep JWT verification enabled, outbound work bounded, credentials public-only and upstream HTML inert. The browser reviews and saves through the existing data layer. See `docs/career-radar-greenhouse-ingestion.md` for initial configuration and `docs/career-radar-ashby-lever-ingestion.md` for the added adapters, current validation and deployment steps. Workday, arbitrary employer retrieval and discovery remain future work.
- `Claude outputs/` contains generated résumés and export samples. Preserve these artifacts unless the task calls for changing them.
- `case-studies/` and `interview/` are currently empty, untracked local placeholders with no defined workflow. Git does not preserve empty directories, so they may be absent in other checkouts. No tool depends on them; their names do not establish a storage plan for future features.

## Development approach

Preserve working code and established URLs. Prefer the smallest change that satisfies the task. Do not move context files, rename parser-dependent sections, split the résumé application, introduce a framework, or restructure deployment without a concrete requirement and an explicit migration plan.

Multiple tools may read the same canonical career files. Each tool should consume only the sources relevant to its task. Career Radar can reuse facts, positioning, and framing; résumé bullet caps and cover-letter structure are not opportunity evaluation criteria. Define Radar-specific search preferences and evaluation policy separately when that work is authorized. Its persistence approach is settled: Supabase, per the storage note below.

Keep API credentials out of browser code and committed files. The repository is public so the tools are reachable via GitHub Pages and the project can serve as a public case study. It also cannot be made private without replacing the résumé builder's runtime fetch of its context files from `raw.githubusercontent.com`. Anything committed anywhere in it is world-readable, regardless of whether GitHub Pages serves it.

Opportunity records belong in Supabase rather than this repository. Because the résumé builder is a static page on a public origin, it can hold no secret: any Supabase access must be gated by row-level security or brokered server-side, never by a key embedded in the page. The Worker's origin allowlist and `TAILOR_KEY` are a cost speed bump, not authentication, and are not sufficient on their own in front of private records.

Keep personal historical staging/seed data, reconciliation reports, backups, source excerpts and generated import artifacts outside this repository. `.gitignore` guards directories named `career-radar-private/` or `career-radar-import-artifacts/` and recognizable artifact filenames against accidental staging. Use the guarded naming patterns when naming import artifacts; never force-add private data. These patterns are a backstop, not permission to store private files here: ignored files can still enter a locally uploaded Pages artifact, and arbitrary filenames are not automatically protected.

Radar uses Supabase Auth + RLS. Supply `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` through the environment; its public-config generator emits only these browser-safe settings. Never pass secret/service-role keys to the application. Keep operator credentials outside this repository. Generated `public-env.js` is ignored; Pages generates it from matching GitHub repository variables during deployment. Missing variables leave the résumé deployment operational and Radar shows a setup error. Preserve Supabase's exact `updated_at` string for guarded writes, including microseconds. Render user-entered content as text, preserve drafts on failed saves, and create history only through the database trigger.

## Validation and collaboration

For documentation changes, check links, file responsibilities, duplicated instructions, and `git diff --check`. For application changes, validate the affected browser flow; for export changes, inspect generated documents; for proxy changes, check relevant request and streaming behavior. Report what was checked and any gaps. Do not introduce a test framework solely for documentation edits.

Claude Code and Codex share this repository. Inspect the current working tree before editing, preserve others' in-progress changes, and avoid overwriting concurrent work. At handoff, report the files changed, decisions made, validation performed, and remaining work. Implementation authorization comes from the user's current task; planned Career Radar work is not blanket authorization to build it.
