// Disposable acceptance harness only. Synthetic Auth/Greenhouse; real schema,
// RLS, revision trigger, history trigger and vendored browser SDK. Never hosted.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalDatabase } from '../../scripts/local-database.js';
import { createIngestionHandler } from '../../ingestion/handler.js';

export async function startFixture(port = 0) {
  const db = await createLocalDatabase();
  const owner = '11111111-1111-4111-8111-111111111111';
  await db.query('insert into auth.users(id) values ($1)', [owner]);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const posting = JSON.parse(await readFile(new URL('./greenhouse/posting.json', import.meta.url), 'utf8'));
  const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'radar@example.invalid', created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, is_anonymous: false };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: owner, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.synthetic`;
  let failNextSave = false;
  let retrieves = 0, attempts = 0;
  let origin = '';
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, origin);
    const send = (body, status = 200) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
    try {
      let text = '';
      for await (const chunk of req) text += chunk;
      if (url.pathname === '/__fixture' && req.method === 'GET') {
        const { rows } = await db.query('select (select count(*)::integer from prospects) as prospects, (select count(*)::integer from prospect_status_events) as events');
        send({ ...rows[0], retrieves, attempts }); return;
      }
      if (url.pathname === '/__fixture/fail-next-save' && req.method === 'POST') { failNextSave = true; send({ ok: true }); return; }
      if (url.pathname === '/auth/v1/token') {
        const credentials = JSON.parse(text);
        if (credentials.email !== user.email || credentials.password !== 'fixture-only-password') { send({ message: 'Use the synthetic fixture account', code: 'invalid_credentials' }, 400); return; }
        send({ access_token: token, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }); return;
      }
      if (url.pathname === '/auth/v1/user') { send(user); return; }
      if (url.pathname === '/auth/v1/logout') { send({}); return; }
      if (url.pathname === '/functions/v1/job-ingest') {
        retrieves++;
        const handler = createIngestionHandler({ ownerId: owner, allowedOrigins: [origin],
          authenticate: async value => value === token ? owner : null,
          fetcher: async target => {
            const id = /\/jobs\/(\d+)/.exec(String(target))?.[1];
            if (id === '404') return Response.json({}, { status: 404 });
            if (id === '99999') await new Promise(done => setTimeout(done, 5000));
            return Response.json(id === '67890' ? { id: 67890, title: 'Designer' } : { ...posting, id: Number(id) });
          }
        });
        const result = await handler(new Request(origin + url.pathname, { method: req.method, headers: req.headers, body: text }));
        res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(await result.text()); return;
      }
      if (url.pathname.startsWith('/rest/v1/')) {
        if (req.headers.authorization !== `Bearer ${token}`) { send({ message: 'Unauthorized', code: 'PGRST301' }, 401); return; }
        const table = url.pathname.split('/').pop();
        if (!['prospects','prospect_status_events'].includes(table)) { send({}, 404); return; }
        if (req.method !== 'GET') {
          attempts++;
          if (failNextSave) { failNextSave = false; send({ message: 'Synthetic save failure; your preview is preserved', code: 'TEST_FAILURE' }, 503); return; }
        }
        const rows = await db.transaction(async tx => {
          await tx.exec('set local role authenticated');
          await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: owner })]);
          const values = []; const clauses = [];
          for (const key of ['id','updated_at','prospect_id']) {
            const value = url.searchParams.get(key);
            if (value?.startsWith('eq.')) { values.push(value.slice(3)); clauses.push(`"${key}" = $${values.length}`); }
          }
          const where = clauses.length ? ' where ' + clauses.join(' and ') : '';
          let query;
          if (req.method === 'GET') {
            query = `select row_to_json(p)::text as value from public.${table} p${where} order by ${table === 'prospects' ? 'id' : 'id'} limit ${Math.min(Number(url.searchParams.get('limit') || 500), 500)} offset ${Number(url.searchParams.get('offset') || 0)}`;
          } else {
            if (table !== 'prospects' || !['POST','PATCH'].includes(req.method)) throw new Error('Unsupported fixture write');
            const body = JSON.parse(text);
            const allowed = ['id','company','title','job_url','source','location','work_arrangement','employment_type','compensation_text','job_description','posted_on','discovered_on','applied_on','notes','status'];
            const keys = Object.keys(body);
            if (keys.some(key => !allowed.includes(key))) throw new Error('Unsupported fixture column');
            if (req.method === 'POST') {
              values.splice(0); values.push(...keys.map(key => body[key]));
              query = `with saved as (insert into prospects (${keys.join(',')}) values (${keys.map((_, index) => '$' + (index + 1)).join(',')}) returning *) select row_to_json(saved)::text as value from saved`;
            } else {
              const assignments = keys.map(key => { values.push(body[key]); return `"${key}" = $${values.length}`; });
              query = `with saved as (update prospects set ${assignments.join(',')}${where} returning *) select row_to_json(saved)::text as value from saved`;
            }
          }
          const result = await tx.query(query, values);
          return result.rows.map(row => JSON.parse(row.value));
        });
        send(req.headers.accept?.includes('application/vnd.pgrst.object+json') ? rows[0] ?? null : rows); return;
      }
      if (url.pathname === '/tools/career-radar/public-env.js') {
        res.writeHead(200, { 'content-type': 'text/javascript' });
        res.end(`export default ${JSON.stringify({ SUPABASE_URL: origin, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic' })};`); return;
      }
      const relative = url.pathname.replace(/^\/tools\/career-radar\//, '');
      if (!url.pathname.startsWith('/tools/career-radar/') || relative.split('/').some(part => part.startsWith('.') || part === 'node_modules') || !/\.(?:html|js|css)$/.test(relative)) { send({}, 404); return; }
      const path = resolve(root, relative);
      if (!path.startsWith(root)) { send({}, 404); return; }
      const bytes = await readFile(path);
      res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(path)], 'cache-control': 'no-store' }); res.end(bytes);
    } catch (error) { send({ message: error.message, code: error.code ?? 'FIXTURE_ERROR' }, 400); }
  });
  try {
    await new Promise((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
  } catch (error) { await db.close(); throw error; }
  origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, close: async () => { await new Promise(done => server.close(done)); await db.close(); } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixture = await startFixture(8777);
  console.log(`Synthetic browser fixture: ${fixture.origin}/tools/career-radar/index.html`);
  console.log('Sign in: radar@example.invalid / fixture-only-password. No hosted connection.');
  process.on('SIGINT', async () => { await fixture.close(); process.exit(0); });
}
