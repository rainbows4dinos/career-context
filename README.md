# Larry Reynolds Career Context

Shared professional context and personal career tools for Larry Reynolds: résumé tailoring, portfolio positioning, interview preparation, and opportunity evaluation.

The résumé and cover-letter builder and Career Radar are the existing tools. Radar supports manual job tracking and editable job URL previews (Greenhouse, Ashby and Lever deployed; limited Workday added); discovery and evaluation are future milestones. The résumé builder will remain as the project grows.

## Shared career context

These files remain at the repository root so existing runtime URLs continue to work. Multiple tools can consume them without maintaining separate copies.

This repository is public. That is what lets the résumé builder fetch these files without a key, and it means anything committed here is world-readable.

| File | Responsibility |
| --- | --- |
| [resume-master.md](resume-master.md) | Career facts, roles, dates, scope notes, positioning, and target roles |
| [experience-framing.md](experience-framing.md) | Why the work mattered, supporting stories, real metrics, and interview framing |
| [voice-and-format.md](voice-and-format.md) | Authoritative writing policy for career communications, including résumé and cover-letter structure |
| [rules.json](rules.json) | Structured application-document rules: bullet caps, word limits, banned words, code-credit language, and role locations |
| [tone-and-positioning.md](tone-and-positioning.md) | Emphasis focus chips for the résumé UI; not the tone authority |

Edit writing guidance in `voice-and-format.md` and countable constraints in `rules.json`. Preserve the emphasis-options format in `tone-and-positioning.md`, which the résumé tool parses.

Career Radar can reuse career facts, positioning, and supporting evidence. Its search preferences, evaluation criteria, and opportunity records will be separate from résumé formatting rules and canonical career facts. Opportunity records will live in Supabase rather than in this repository, so that tracking a company does not mean publishing it.

Keep personal job-search staging/seed files, reconciliation reports, backups, source excerpts, and generated import artifacts outside this public repository. The defensive patterns in `.gitignore` help prevent accidental commits of recognizable artifacts; they do not make files private. See [AGENTS.md](AGENTS.md#development-approach) for naming and handling guidance.

Career Radar's database and typed application live in `supabase/` and `tools/career-radar/`. The initial migration is applied to the hosted project. See [setup and validation](docs/career-radar-v0.md) and the [implementation plan](docs/career-radar-v0-implementation-plan.md).

For URL import, see [Greenhouse configuration and hosted results](docs/career-radar-greenhouse-ingestion.md), [Ashby/Lever implementation and deployment steps](docs/career-radar-ashby-lever-ingestion.md), [limited Workday support and deployment](docs/career-radar-workday-ingestion.md), and the [approved ingestion architecture](docs/career-radar-url-ingestion-plan.md).

## Repository instructions

[AGENTS.md](AGENTS.md) is the canonical, tool-agnostic source of development instructions. [CLAUDE.md](CLAUDE.md) imports it for Claude Code compatibility. Keep shared instructions in `AGENTS.md`.

Repository agents should read `AGENTS.md` and the career files relevant to their task. Workflows based on uploaded documents should receive those files explicitly. Runtime applications load their own context; the résumé builder does not read `AGENTS.md` or `CLAUDE.md`.

## Existing tools

- [tools/resume-tailor.html](tools/resume-tailor.html): the résumé and cover-letter builder. One standalone page covering tailoring, revisions, QA warnings, and downloads.
- [tools/career-radar/index.html](tools/career-radar/index.html): private prospect tracking with a status board, core details, status history and editable posting previews. Also linked from the résumé builder.
- [tools/proxy-worker.js](tools/proxy-worker.js): Cloudflare Worker that proxies Anthropic API requests using a server-side secret.
- [tools/wrangler.toml](tools/wrangler.toml): configuration for the separately deployed Worker.
- [.github/workflows/pages.yml](.github/workflows/pages.yml): publishes the repository root to GitHub Pages on pushes to `main` or manual dispatch.
- `Claude outputs/`: generated résumés and export samples, kept as reference.

The builder produces one download per application: a **Download Package** zip holding the résumé and cover letter as PDF and `.docx`, an ATS-plain résumé for Workday autofill, and a README describing them.

For architecture and the constraints that apply when changing any of this, see [AGENTS.md](AGENTS.md).

## Deployment and editing

The site, résumé Worker and Radar ingestion function deploy separately. Pushing to `main` publishes the repository root to GitHub Pages; the Worker ships on its own with `wrangler deploy`, and the ingestion function uses the Supabase CLI.

The builder fetches the five shared files above from `main` at runtime, so editing one locally changes nothing until it is pushed — including when you serve the page from your own machine.

For Radar deployment, configure GitHub repository **Variables** named `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` under **Settings → Secrets and variables → Actions**. Pages generates the public configuration during deployment. Sign in with your provisioned Supabase Auth user; the Supabase dashboard account is separate.
