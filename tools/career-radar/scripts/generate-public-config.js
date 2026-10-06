import { writeFile } from 'node:fs/promises';
import { readPublicConfig } from '../config.js';

// Validate before writing. Only these two public values can enter the artifact.
const config = readPublicConfig(process.env);
await writeFile(new URL('../public-env.js', import.meta.url),
  `// Generated from public environment settings. Do not edit.\nexport default ${JSON.stringify({
    SUPABASE_URL: config.supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: config.publishableKey
  }, null, 2)};\n`);
console.log('Generated tools/career-radar/public-env.js (public credentials only).');
