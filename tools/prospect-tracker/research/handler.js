import { readBounded } from '../ingestion/bounded-fetch.js';
import { IngestionError } from '../ingestion/errors.js';
import { decisionsInput, LIMITS } from './contract.js';
import { profileSummary, runResearch } from './run.js';

/** Load using the user's JWT and a public Supabase key. RLS remains authoritative; no admin credentials.
 * @param {{supabaseUrl:string,publishableKey:string}} config @param {typeof fetch} fetcher */
export function createProfileLoader(config,fetcher) {
  /** @param {string} token @param {string} owner @param {AbortSignal} signal */
  return async (token,owner,signal) => {
    const url = new URL(`${config.supabaseUrl}/rest/v1/career_profiles`);
    url.searchParams.set('select','explicit_profile,reviewed_at,revision'); url.searchParams.set('owner_id',`eq.${owner}`);
    const r = await fetcher(url.href,{redirect:'manual',signal,headers:{apikey:config.publishableKey,Authorization:`Bearer ${token}`,Accept:'application/json'}});
    try {
      if (!r.ok) throw new Error('Profile unavailable.');
      const rows = JSON.parse(await readBounded(r,65536,signal));
      if (!Array.isArray(rows) || rows.length !== 1 || !Number.isSafeInteger(rows[0].revision) || rows[0].revision < 1 || typeof rows[0].reviewed_at !== 'string' || !Number.isFinite(Date.parse(rows[0].reviewed_at))) throw new Error('Review a career profile first.');
      return /** @type {{explicit_profile:unknown,reviewed_at:string,revision:number}} */ (rows[0]);
    } finally { await r.body?.cancel().catch(() => {}); }
  };
}

/** Existing authenticated owner-only function pattern. Decisions are transient input, never written.
 * @param {{ownerId:string,allowedOrigins:string[],key:string,enabled:boolean,billingConfirmed:boolean,authenticate:(token:string,signal:AbortSignal)=>Promise<string|null>,loadProfile:(token:string,owner:string,signal:AbortSignal)=>Promise<{explicit_profile:unknown,reviewed_at:string|null,revision:number}>,fetcher:typeof fetch,cooldownMs?:number,workTimeoutMs?:number,recheckTimeoutMs?:number}} options */
export function createResearchHandler(options) {
  // Per-instance brake only; not a distributed rate limit or billing ceiling.
  let busy = false, lastStart = -Infinity;
  /** @param {Request} request */
  return async request => {
    const origin = request.headers.get('origin');
    const headers = new Headers({'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin'});
    if (origin && options.allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin',origin); headers.set('Access-Control-Allow-Headers','authorization, apikey, content-type, x-client-info'); headers.set('Access-Control-Allow-Methods','POST, OPTIONS');
    }
    /** @param {unknown} body @param {number} [status] */
    const reply = (body,status=200) => new Response(JSON.stringify(body),{status,headers});
    if (origin && !options.allowedOrigins.includes(origin)) return reply({error:{code:'origin_denied',message:'Origin is not permitted.'}},403);
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
    if (request.method!=='POST') return reply({error:{code:'method_not_allowed',message:'Use POST.'}},405);
    if (!options.enabled || !options.billingConfirmed || !options.key || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(options.ownerId) || !options.allowedOrigins.length) return reply({error:{code:'not_configured',message:'Research is disabled until server credentials and billing controls are configured.'}},503);
    const controller = new AbortController(), cancel = () => controller.abort();
    request.signal.addEventListener('abort',cancel,{once:true}); if (request.signal.aborted) cancel();
    // Reserve five seconds for a fresh final profile check inside the total deadline.
    const deadline = Date.now()+LIMITS.runTimeoutMs;
    const timer = setTimeout(cancel,Math.min(options.workTimeoutMs ?? LIMITS.runTimeoutMs-5000,LIMITS.runTimeoutMs-5000)); let acquired = false;
    try {
      const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get('authorization') ?? '')?.[1];
      if (!token) throw new IngestionError('unauthorized','Sign in to research opportunities.',401);
      const owner = await options.authenticate(token,controller.signal);
      if (!owner) throw new IngestionError('unauthorized','Sign in again.',401);
      if (owner!==options.ownerId) throw new IngestionError('forbidden','Account is not permitted.',403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw new IngestionError('invalid_request','Expected JSON.');
      let input;
      try {
        input = JSON.parse(await readBounded(request,131072,controller.signal));
        if (!input || Object.keys(input).some(k => !['profile_revision','decisions','focus'].includes(k)) || !Number.isSafeInteger(input.profile_revision) || input.profile_revision<1 || input.focus!==undefined && (typeof input.focus!=='string' || input.focus.length>500 || /@|https?:\/\//i.test(input.focus))) throw new Error();
        input.decisions = decisionsInput(input.decisions);
      } catch { throw new IngestionError('invalid_request','Supply a profile revision, bounded decision identities and optional nonpersonal search focus.'); }
      const row = await options.loadProfile(token,owner,controller.signal);
      if (row.revision!==input.profile_revision || !row.reviewed_at) throw new IngestionError('profile_changed','Review the current profile before searching.',409);
      try { profileSummary(row); } catch { throw new IngestionError('profile_not_ready','Review a nonempty profile with factors no longer than 1200 characters and an 8000-character summary.',409); }
      if (busy || Date.now()-lastStart < (options.cooldownMs ?? 60000)) throw new IngestionError('busy','Research is already running or cooling down. Keep current results.',429);
      controller.signal.throwIfAborted(); busy = true; acquired = true; lastStart = Date.now();
      const run = await runResearch({row,decisions:input.decisions,focus:input.focus ?? '',key:options.key,fetcher:options.fetcher,signal:controller.signal});
      const recheck = new AbortController();
      const cancelRecheck = () => recheck.abort();
      request.signal.addEventListener('abort',cancelRecheck,{once:true});
      if (request.signal.aborted) cancelRecheck();
      const remaining = Math.max(0,Math.min(options.recheckTimeoutMs ?? 5000,5000,deadline-Date.now()));
      const recheckTimer = setTimeout(cancelRecheck,remaining);
      try {
        if (!remaining) throw new Error();
        const current = await options.loadProfile(token,owner,recheck.signal);
        recheck.signal.throwIfAborted();
        if (current.revision!==row.revision || current.reviewed_at!==row.reviewed_at) throw new Error();
      } catch {
        run.status='failed'; run.error_code='profile_mismatch'; run.opportunities=[]; run.notes.push('Profile changed or could not be rechecked. Retain previous results and review the profile.');
      } finally { clearTimeout(recheckTimer); request.signal.removeEventListener('abort',cancelRecheck); }
      return reply(run);
    } catch (error) {
      if (controller.signal.aborted) return reply({error:{code:'timeout',message:'Research canceled or timed out. Retain previous results; no retry was made.'}},504);
      if (error instanceof IngestionError) return reply({error:{code:error.code,message:error.message}},error.status);
      return reply({error:{code:'research_failed',message:'Could not research opportunities. Retain previous results; no retry was made.'}},502);
    } finally { clearTimeout(timer); request.signal.removeEventListener('abort',cancel); if (acquired) busy=false; }
  };
}
