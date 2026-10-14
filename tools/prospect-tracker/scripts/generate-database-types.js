import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef || !/^[a-z0-9]+$/.test(projectRef)) throw new Error('SUPABASE_PROJECT_REF is required');
// No password/token on the command line; the CLI reads its own login or env.
// Capture output first so a failed generation cannot truncate the existing file.
const generated = execFileSync('supabase', [
  'gen', 'types', 'typescript', '--project-id', projectRef, '--schema', 'public'
], { encoding: 'utf8', cwd: new URL('../../..', import.meta.url), stdio: ['ignore', 'pipe', 'inherit'] });
if (!generated.includes('prospects:') || !generated.includes('prospect_status_events:')) {
  throw new Error('Generated schema is missing Career Radar tables; apply the migration first');
}
await writeFile(new URL('../database.types.ts', import.meta.url), generated);
console.log('Generated database.types.ts from the configured Supabase project.');
