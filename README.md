# Larry Reynolds Career Context

This repository contains canonical professional context for resume tailoring, portfolio positioning, interview prep, and AI-assisted workflows.

Preferred tone:
- thoughtful
- direct
- human
- strategic
- avoids corporate jargon
- avoids em dashes

Primary positioning:
Strategic product designer focused on systems thinking, AI-native workflows, and human-centered experiences.

Avoid:
- "20+ years"
- AI hype language
- generic leadership clichés

---

## Context Files

| File | Purpose |
|------|---------|
| `resume-master.md` | Factual layer — titles, dates, bullets, metrics |
| `experience-framing.md` | Narrative layer — the why-it-mattered framing, interview angles, real numbers |
| `tone-and-positioning.md` | Tone rules, positioning guidance, and what to avoid |
| `README.md` | Repo overview and tool documentation |

The tool fetches these files from GitHub at runtime, so any edits are picked up automatically on next load — no code changes needed.

---

## Tools

### Resume Tailor

`tools/resume-tailor.html` — AI-powered resume and cover letter generator.

**Live:** https://rainbows4dinos.github.io/career-context/tools/resume-tailor.html

#### How it works

- Fetches context files from this repo at runtime (resume-master.md, experience-framing.md, tone-and-positioning.md)
- Streams responses from the Anthropic API via a Cloudflare Worker proxy, with status messages tied to actual generation progress
- Generates tailored resume and cover letter previews in-browser
- Downloads polished .docx files matching Larry's template styling (Helvetica Neue, correct weights, spacing, dividers)

#### Features

- **Resume + cover letter generation** — tailored to a specific job description, with optional emphasis focus toggles and freeform notes
- **Streaming generation** — status messages update in real time as the model works through each section (summary, experience, cover letter, etc.)
- **Revision flow** — after generation, request targeted revisions to the active tab (resume or cover letter) without regenerating everything
- **Change visibility** — revised content is highlighted in yellow; a "Revised:" callout summarizes what changed and why. Both are suppressed on download so .docx files stay clean
- **Dark / light mode** — toggle in the header, defaults to dark, preference persisted to localStorage
- **Styled to match larryjr.design** — Crimson Pro (headings), Readex Pro (body), dark-mode color system with Red accent

#### Dependencies

- **Cloudflare Worker proxy:** https://resume-tailor-proxy.larryjrdesign.workers.dev
  - Handles CORS for GitHub Pages and forwards streaming responses from the Anthropic API
  - API key stored as a Wrangler secret (`ANTHROPIC_API_KEY`) — never committed to repo
- **docx.js** — loaded from CDN at runtime on first download click
- **Google Fonts** — Crimson Pro, Readex Pro, Material Icons Outlined

#### Updating

- **Context (resume content, tone, framing):** edit the relevant `.md` file and push — the tool picks up changes on next load
- **Tool UI or behavior:** edit `tools/resume-tailor.html` and push
- **Proxy:** edit `tools/proxy-worker.js` and redeploy via Wrangler (`wrangler deploy`)