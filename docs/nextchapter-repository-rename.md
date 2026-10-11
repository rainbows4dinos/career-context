# Repository rename readiness

The product is now nextchapter; the repository remains `rainbows4dinos/career-context`. No remote, hosted project, database, or credential was changed for this task. Assessment is based on checked-in source, not hosted dashboard settings.

## Dependencies and risks

| Dependency | Current reference | Rename action |
| --- | --- | --- |
| Builder context loading | `tools/resume-tailor.html`: `REPO_RAW` points to `raw.githubusercontent.com/rainbows4dinos/career-context/main` | Update to `nextchapter` during cutover; verify all five files load and parse. Do not depend on raw-content redirects. |
| Builder version check and repository link | GitHub commits API and visible GitHub link in the same HTML | Update both to the new repository URL after rename. |
| GitHub Pages | `.github/workflows/pages.yml` uploads repository root; project path is `/career-context/` | New project path will be `/nextchapter/`. Workflow has no hardcoded repository name; check Pages settings, `github-pages` environment, variables and a successful fresh deployment. |
| Navigation and handoff | Shared modules and assets use relative URLs; handoff keys include the Builder pathname | Relative links adapt to the new prefix. Old-path pending handoffs cannot be consumed at the new path; finish them or allow their five-minute expiry before cutover. No permanent prospect data is held there. |
| Browser storage | Theme and SDK auth storage are origin-scoped; handoffs are path-scoped | Same `rainbows4dinos.github.io` origin retains theme and SDK storage. A custom domain changes the origin and requires sign-in again; Builder drafts are memory-only, so finish/download before navigating. |
| Anthropic Worker | `tools/proxy-worker.js` allows `https://rainbows4dinos.github.io`; Builder uses its existing workers.dev endpoint | Repository-only rename leaves the origin unchanged, so no Worker deployment is needed. A custom domain would need explicit origin configuration and separate Worker validation. Keep Worker name and secrets. |
| Supabase ingestion | `RADAR_ALLOWED_ORIGINS`, single-owner UUID, existing project/function | Repository-only rename leaves the origin unchanged. Check hosted origin settings without renaming the project, function, tables or environment keys. |
| Supabase Auth | `supabase/config.toml` local `site_url` is `http://localhost:8000/tools/career-radar/`; current UI uses password sign-in, no `redirectTo` | Local URL remains valid. Inspect hosted Site URL and redirect allowlist for `/career-context/` entries; update to `/nextchapter/` if present. Existing hash routes remain unchanged. |
| Public configuration | Pages repository variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; scoped generator | Preserve variables and public configuration generation; Supabase URLs/keys do not follow the GitHub repository name. |
| Build/deploy tooling | Scoped npm package, vendor/icon/type generators, Pages root upload | No repository-name dependency in production scripts. Keep `career-radar-foundation`, directories and `supabase/config.toml` project ID. |
| Vercel | No tracked Vercel config or local `.vercel` linkage found | External Vercel Git integrations/webhooks cannot be verified from this checkout. If one exists, verify its repository connection, build paths, environment and redeployment after rename; do not rename its project. |
| Documentation and fixtures | AGENTS runtime URL; setup examples, historical deployment links, token docs, tests using `/career-context/` | Update current setup links and runtime instructions during cutover. Retain historical references where useful. Test both old and new prefixes rather than blanket replacing fixtures. |
| Git remotes / external consumers | Current repository URL, third-party clones/bookmarks/integrations | Update local remotes only with separate authorization. Audit external references and integrations with their owners; this checkout cannot establish that they are all ready. |

GitHub redirects repository pages and Git operations after a rename, but excludes project Pages URLs. Do not assume old Pages bookmarks will redirect. GitHub recommends a custom domain for URL stability; do not reuse the old repository name, which removes repository redirects. See [GitHub’s rename guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).

## Recommended sequence

1. Before rename, review this inventory, record current Pages/Auth/origin/integration settings and deployment status, and choose how existing Pages bookmarks will be handled. A custom domain or separately approved compatibility hosting requires additional work; none is introduced here.
2. Prepare a small cutover patch for Builder’s three GitHub references and current setup documentation. Keep old URLs active until rename; do not push future raw URLs early. Finish in-memory Builder drafts/downloads and pending handoffs.
3. With separate approval, rename the existing GitHub repository to `nextchapter`; preserve history/issues/PRs rather than forking. Do not rename Supabase or Worker projects.
4. Apply the prepared patch and deploy Pages. Verify repository variables, environment permissions, external Git integrations and hosted Auth URL settings. Update approved local remotes to the new repository URL.
5. Test `/nextchapter/tools/career-radar.html`, tracker board/detail deep links, Builder context loading/version check/generation/exports, auth, all ATS ingestion providers and handoff. Confirm origin allowlists only need changes if the origin changed.
6. Update bookmarks and current documentation. Verify any separately approved old-Pages compatibility strategy. Keep the old repository name unused to preserve GitHub redirects.

Readiness: the code is compatible with a changed Pages prefix, but the rename should wait for the cutover patch and hosted settings/old-bookmark review. Neither the rename nor deployed acceptance is part of this implementation.
