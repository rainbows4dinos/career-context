# nextchapter

Shared professional context and personal career tools for Larry Reynolds: résumé tailoring, portfolio positioning, interview preparation, and opportunity evaluation.

nextchapter connects three applications: Career Radar (coming soon) for discovery and evaluation, Prospect Tracker for managing prospects and applications, and Résumé Builder for tailored application materials. Prospect Tracker retains existing manual tracking and editable job URL previews (Greenhouse, Ashby, Lever, account-qualified Workable and limited Workday).

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

Prospect Tracker's database and typed application live in `supabase/` and `tools/prospect-tracker/`. The initial migration is applied to the hosted project. See [setup and validation](docs/career-radar-v0.md) and the [implementation plan](docs/career-radar-v0-implementation-plan.md).

For URL import, see [Greenhouse configuration and hosted results](docs/career-radar-greenhouse-ingestion.md), [Ashby/Lever implementation and deployment steps](docs/career-radar-ashby-lever-ingestion.md), [limited Workday support and deployment](docs/career-radar-workday-ingestion.md), and the [approved ingestion architecture](docs/career-radar-url-ingestion-plan.md).

For Workable, see [supported links, validation and deployment](docs/prospect-tracker-workable-ingestion.md) and the preceding [compatibility spike](docs/prospect-tracker-workable-spike.md).

## Repository instructions

[AGENTS.md](AGENTS.md) is the canonical, tool-agnostic source of development instructions. [CLAUDE.md](CLAUDE.md) imports it for Claude Code compatibility. Keep shared instructions in `AGENTS.md`.

Repository agents should read `AGENTS.md` and the career files relevant to their task. Workflows based on uploaded documents should receive those files explicitly. Runtime applications load their own context; the résumé builder does not read `AGENTS.md` or `CLAUDE.md`.

## Existing tools

- [index.html](index.html): the site root opens the Prospect Tracker board; signed-out visitors use its existing sign-in flow.
- [tools/resume-tailor.html](tools/resume-tailor.html): the résumé and cover-letter builder. One static page covering tailoring, revisions, QA warnings, and downloads.
- [tools/career-radar.html](tools/career-radar.html): Career Radar coming soon; discovery and evaluation are not implemented.
- [tools/prospect-tracker/index.html](tools/prospect-tracker/index.html): Prospect Tracker, private prospect tracking with a status board, core details, status history and editable posting previews. Also linked from the résumé builder.
- [tools/about.html](tools/about.html): a public introduction to nextchapter, its tools, and shared professional context.
- [tools/proxy-worker.js](tools/proxy-worker.js): Cloudflare Worker that proxies Anthropic API requests using a server-side secret.
- [tools/wrangler.toml](tools/wrangler.toml): configuration for the separately deployed Worker.
- [.github/workflows/pages.yml](.github/workflows/pages.yml): publishes the repository root to GitHub Pages on pushes to `main` or manual dispatch.
- `Claude outputs/`: generated résumés and export samples, kept as reference.

The builder produces one download per application: a **Download Package** zip holding the résumé and cover letter as PDF and `.docx`, an ATS-plain résumé for Workday autofill, and a README describing them.

For architecture and the constraints that apply when changing any of this, see [AGENTS.md](AGENTS.md).

## Shared interface

The suite shares Figma-based color and typography tokens, Gravity UI icons, and opt-in native components. Application layout and behavior remain local. Implementation reports cover [foundations](docs/nextchapter-shared-foundations-phase1.md), [Actions](docs/nextchapter-actions-phase2a.md), [Inputs and Status](docs/nextchapter-inputs-status-phase2b.md), and [Navigation and About](docs/nextchapter-navigation.md).

The shared header links the three tools and About. Wide layouts show utility links directly; compact desktop layouts use the More popover for About and Log In/Log Out; mobile layouts use an expandable navigation panel. Account controls reuse Prospect Tracker’s existing authentication. Builder, Career Radar’s placeholder, and About remain public. Login from another tool returns to that tool after authentication; logout stays on the current page.

Dark remains the default theme, with a persistent light/dark switch. Shared sizing keeps borders and padding within specified outer dimensions. Tokens and component styles live in `tools/shared/`; document previews and export formatting remain in Builder. Copying the résumé HTML requires preserving its relative shared assets and the referenced Tracker authentication configuration/vendor files. See [token boundaries](docs/shared-design-tokens.md) and [navigation dependencies](docs/nextchapter-navigation.md).

For the current implementation baseline, validation commands, and continuation boundaries, see the [Claude Code handoff](docs/claude-code-handoff.md).

## Deployment and editing

The site, résumé Worker and Radar ingestion function deploy separately. Pushing to `main` publishes the repository root to GitHub Pages; the Worker ships on its own with `wrangler deploy`, and the ingestion function uses the Supabase CLI.

The builder fetches the five shared files above from `main` at runtime, so editing one locally changes nothing until it is pushed — including when you serve the page from your own machine.

For Prospect Tracker deployment, configure GitHub repository **Variables** named `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` under **Settings → Secrets and variables → Actions**. Pages generates the public configuration during deployment. Sign in with your provisioned Supabase Auth user; the Supabase dashboard account is separate.

The repository was renamed from `career-context` to `nextchapter`; Pages now serves from `/nextchapter/`. See the [repository rename record](docs/nextchapter-repository-rename.md) for the cutover inventory and remaining hosted checks.
