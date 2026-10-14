import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const appRoot = new URL('../', import.meta.url);
const vendorRoot = new URL('../vendor/', import.meta.url);
const readJson = async url => JSON.parse(await readFile(url, 'utf8'));
const app = await readJson(new URL('package.json', appRoot));
const lock = await readJson(new URL('package-lock.json', appRoot));
const sdkRoot = dirname(require.resolve('@supabase/supabase-js/package.json'));
const sdk = await readJson(join(sdkRoot, 'package.json'));
if (sdk.version !== app.dependencies['@supabase/supabase-js'] ||
    lock.packages['node_modules/@supabase/supabase-js'].version !== sdk.version) {
  throw new Error('Installed SDK must match the exact package.json and package-lock.json version. Run npm ci.');
}
const source = await readFile(join(sdkRoot, 'dist/umd/supabase.js'), 'utf8');
// The published standalone bundle defines a module-local `supabase` variable.
// Preserve its bytes and add only a named export for our existing import map.
if (!source.startsWith('var supabase=') || /\bimport\s*\(/.test(source)) {
  throw new Error('Upstream browser bundle changed shape; review before vendoring.');
}
const module = source + '\n// ESM adapter for the published standalone Supabase browser bundle.\nexport const createClient = supabase.createClient;\n';
const digest = value => createHash('sha256').update(value).digest('hex');
const licenses = [];
for (const [name, file] of [
  ['@supabase/supabase-js', 'LICENSE'], ['@supabase/auth-js', 'LICENSE'],
  ['@supabase/functions-js', 'LICENSE'], ['@supabase/postgrest-js', 'LICENSE'],
  ['@supabase/realtime-js', 'LICENSE'], ['@supabase/storage-js', 'LICENSE'],
  ['@supabase/phoenix', 'LICENSE.md'], ['iceberg-js', 'LICENSE']
]) {
  // npm ci installs these locked packages at the paths recorded in this lockfile.
  if (!lock.packages[`node_modules/${name}`]) throw new Error(`Missing locked license source: ${name}`);
  licenses.push(`${name}\n${await readFile(new URL(`node_modules/${name}/${file}`, appRoot), 'utf8')}`);
}
const outputs = {
  'supabase.js': module,
  'LICENSES.txt': licenses.join('\n\n----------------------------------------\n\n'),
  'provenance.json': JSON.stringify({
    package: sdk.name, version: sdk.version,
    upstreamFile: 'dist/umd/supabase.js',
    npmIntegrity: lock.packages['node_modules/@supabase/supabase-js'].integrity,
    upstreamSha256: digest(source), moduleSha256: digest(module)
  }, null, 2) + '\n'
};
if (process.argv.includes('--check')) {
  for (const [name, content] of Object.entries(outputs)) {
    if (await readFile(new URL(name, vendorRoot), 'utf8') !== content) {
      throw new Error(`Vendored ${name} differs from the pinned SDK. Review and run npm run vendor:generate.`);
    }
  }
  console.log(`Vendored Supabase ${sdk.version}: bundle, licenses, and provenance verified.`);
} else {
  await mkdir(vendorRoot, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) await writeFile(new URL(name, vendorRoot), content);
  console.log(`Vendored Supabase ${sdk.version} from the installed npm package.`);
}
