# Repository Instructions

## Purpose and scope

This repository holds Larry Reynolds's canonical career context and personal career tools. The résumé and cover-letter builder is the existing working tool. Career Radar is planned for discovering, evaluating, and tracking job opportunities; it is not implemented yet.

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
- Export libraries load from CDNs. There is no tracked package manifest, build system, or automated test suite.
- Generated application data lives in browser memory; local storage currently persists theme preference only. There is no opportunity tracking store.
- `Claude outputs/` contains committed sample documents. Preserve these artifacts unless the task calls for changing them.

## Development approach

Preserve working code and established URLs. Prefer the smallest change that satisfies the task. Do not move context files, rename parser-dependent sections, split the résumé application, introduce a framework, or restructure deployment without a concrete requirement and an explicit migration plan.

Multiple tools may read the same canonical career files. Each tool should consume only the sources relevant to its task. Career Radar can reuse facts, positioning, and framing; résumé bullet caps and cover-letter structure are not opportunity evaluation criteria. Define Radar-specific search preferences and evaluation policy separately when that work is authorized. Choose its persistence approach explicitly before implementing tracking.

Keep API credentials out of browser code and committed files. Account for the Pages workflow publishing the repository root when deciding where future opportunity records belong.

## Validation and collaboration

For documentation changes, check links, file responsibilities, duplicated instructions, and `git diff --check`. For application changes, validate the affected browser flow; for export changes, inspect generated documents; for proxy changes, check relevant request and streaming behavior. Report what was checked and any gaps. Do not introduce a test framework solely for documentation edits.

Claude Code and Codex share this repository. Inspect the current working tree before editing, preserve others' in-progress changes, and avoid overwriting concurrent work. At handoff, report the files changed, decisions made, validation performed, and remaining work. Implementation authorization comes from the user's current task; planned Career Radar work is not blanket authorization to build it.
