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
- “20+ years”
- AI hype language
- generic leadership clichés


## Tools

### Resume Tailor
`tools/resume-tailor.html` — AI-powered resume and cover letter generator.

**Live:** https://rainbows4dinos.github.io/career-context/tools/resume-tailor.html

**How it works:**
- Fetches context from this repo at runtime (resume-master.md, experience-framing.md, README.md)
- Calls Anthropic API via a Cloudflare Worker proxy to handle CORS
- Generates tailored .docx files matching Larry's resume and cover letter templates

**Dependencies:**
- Cloudflare Worker: https://resume-tailor-proxy.larryjrdesign.workers.dev
- API key stored as a Wrangler secret (ANTHROPIC_API_KEY) — never committed to repo
- docx.js loaded from CDN at runtime for document generation

**To update the tool's context:** edit resume-master.md or experience-framing.md and push. 
The tool picks up changes automatically on next load — no code changes needed.

**To update the tool itself:** edit tools/resume-tailor.html and push.