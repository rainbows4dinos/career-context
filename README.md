# Larry Reynolds Career Context

Canonical professional context for resume tailoring, portfolio positioning, interview prep, and AI-assisted workflows.

Files, in the order the tailor tool uses them:

- `resume-master.md` — the facts layer. Roles, dates, bullets, scope notes, target roles.
- `experience-framing.md` — the why-it-mattered layer. Story angles and real numbers.
- `voice-and-format.md` — the authoritative voice, length, and format rules. Anything generated from this repo follows it.
- `tone-and-positioning.md` — emphasis focus chips for the tool. Not a tone source anymore.
- `tools/resume-tailor.html` — the tailor app. Fetches the files above from this repo at runtime, so changes here only reach the tool once pushed to main.
- `tools/proxy-worker.js` — Cloudflare Worker that holds the Anthropic key.

Tone rules used to be duplicated here and in tone-and-positioning.md. They are not anymore. Edit voice-and-format.md instead.
