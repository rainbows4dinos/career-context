# Vendored Supabase browser SDK

`supabase.js` contains the standalone `dist/umd/supabase.js` distributed in
`@supabase/supabase-js@2.117.2`, followed by a single ESM export of `createClient`.
The upstream bundle's bytes are otherwise unchanged. All SDK JavaScript is
served from this repository; it has no runtime import of CDN code. Supabase
API requests still go to the configured project.

`provenance.json` records the npm lockfile integrity and SHA-256 hashes of the
upstream bundle and adapted module. `LICENSES.txt` retains notices for Supabase
and its bundled dependencies. Do not hand-edit generated files.

From `tools/career-radar/`:

```sh
npm ci
npm run vendor:check
```

For a reviewed SDK upgrade, update the exact dependency version and lockfile,
then run `npm run vendor:generate`. Review and commit the module, licenses, and
provenance together. Run typecheck, lint, tests, and browser acceptance before
shipping. `vendor:check` fails if the installed SDK, lockfile, or generated
artifacts disagree. No generation or npm installation is needed on Pages.

The generator uses the official npm package's existing standalone bundle; it
does not fetch a CDN response or introduce a frontend bundler.
