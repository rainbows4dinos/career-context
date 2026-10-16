import { Parser } from 'htmlparser2';
import { ingestPosting } from '../ingestion/pipeline.js';
import { IngestionError } from '../ingestion/errors.js';
import { readBounded } from '../ingestion/bounded-fetch.js';
import { checkTarget, LIMITS, normalized, safeUrl } from './contract.js';

/** Inert HTML observation. Never executes scripts, loads frames, submits forms or follows links.
 * @param {string} html @param {string} url @param {string} company @param {string} title */
export function inspectHtml(html, url, company, title) {
  let visible = '', headings = '', depth = 0, heading = 0;
  /** @type {{ignored:boolean,heading:boolean}[]} */ const stack = [];
  /** @type {Array<{href:string|null,label:string}>} */ const controls = [];
  /** @type {{href:string|null,label:string}|null} */ let control = null;
  /** @type {Array<{action:string|null,fields:Set<string>}>} */ const forms = [];
  /** @type {{action:string|null,fields:Set<string>}|null} */ let form = null;
  const parser = new Parser({
    onopentag(name, a) {
      const ignored = ['script','style','noscript','template','svg','iframe','object'].includes(name) || a.disabled !== undefined || a['aria-disabled'] === 'true' || name === 'input' && a.type?.toLowerCase() === 'hidden' || a.hidden !== undefined || a['aria-hidden'] === 'true' || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(a.style ?? '');
      const isHeading = /^(?:h[1-3]|title)$/.test(name);
      stack.push({ ignored, heading: isHeading }); if (ignored) depth++; if (isHeading) heading++;
      if (depth) return;
      visible += ' ';
      if (name === 'a' || name === 'button') { control = { href: a.href ?? null, label: a['aria-label'] ?? '' }; controls.push(control); }
      if (name === 'form') { form = { action: a.action ?? null, fields: new Set() }; forms.push(form); }
      if (name === 'input' && form) form.fields.add(`${a.type ?? ''} ${a.name ?? ''} ${a.id ?? ''}`.toLowerCase());
    },
    ontext(value) { if (!depth) { visible += value + ' '; if (heading) headings += value + ' '; if (control) control.label += value; } },
    onclosetag(name) {
      const last = stack.pop(); if (last?.ignored) depth--; if (last?.heading) heading--;
      if (name === 'a' || name === 'button') control = null;
      if (name === 'form') form = null;
    }
  }, { decodeEntities: true });
  parser.end(html);
  visible = visible.replace(/\s+/g,' ').trim(); headings = headings.replace(/\s+/g,' ').trim();
  const missing = /(?:job|position|posting|page)\s+(?:was\s+|is\s+)?not\s+found|(?:job|position|posting)\s+(?:is\s+|has\s+been\s+)?(?:closed|filled|expired)|(?:job|position|posting|page)\s+(?:you(?:'re| are)\s+looking for\s+)?(?:is\s+)?(?:no longer available|doesn['’]t exist|does not exist)|no longer accepting applications/i;
  const blocked = /access denied|verify (?:you are|you're) human|captcha|checking your browser|just a moment/i;
  const prominent = headings + ' ' + (visible.length < 5000 ? visible : visible.slice(0,500));
  if (blocked.test(prominent)) return { availability: /** @type {const} */ ('uncertain'), reason: 'blocked_page', application: { status: /** @type {const} */ ('not_established'), url: null }, identityMatched: false };
  if (missing.test(visible)) return { availability: /** @type {const} */ ('unavailable'), reason: 'explicit_missing_or_closed', application: { status: /** @type {const} */ ('not_established'), url: null }, identityMatched: false };
  const body = normalized(visible), titleKey = normalized(title), companyKey = normalized(company);
  const identityMatched = !!(titleKey && companyKey && normalized(headings).includes(titleKey) && body.includes(companyKey) && visible.length >= 150);
  /** Resolve observed href/action only. Missing attributes do not invent application URLs.
   * @param {string|null} href */
  const observed = href => { try { return href ? safeUrl(new URL(href, url).href) : null; } catch { return null; } };
  const applicationForm = identityMatched && forms.find(f => [...f.fields].some(x => /^email\s/.test(x)) && [...f.fields].some(x => /^file\s.*(?:resume|cv|curriculum)/.test(x)));
  const apply = identityMatched && controls.find(c => /\bapply\b|submit application|application form/i.test(c.label));
  const application = applicationForm ? { status: /** @type {const} */ ('form_observed'), url: applicationForm.action ? observed(applicationForm.action) : url } : apply ? { status: /** @type {const} */ ('control_visible'), url: observed(apply.href) } : { status: /** @type {const} */ ('not_established'), url: null };
  return { availability: /** @type {const} */ ('uncertain'),
    reason: identityMatched ? 'html_identity_only' : /enable javascript|javascript.*required/i.test(visible) || visible.length < 150 ? 'javascript_or_unreadable' : 'identity_not_established', application, identityMatched };
}

/** Existing structured adapters are authoritative only for their independently retrieved fields.
 * At most two adapter requests plus one inert original HTML observation, sharing one deadline.
 * No credentials, redirects, resource loads or writes. Unsupported hosts are never fetched.
 * @param {import('./types.ts').Candidate} candidate
 * @param {{fetcher:typeof fetch,signal:AbortSignal,now?:()=>Date,timeoutMs?:number}} options
 * @returns {Promise<import('./types.ts').PostingCheck>} */
export async function verifyPosting(candidate, options) {
  const url = candidate.original_employer_or_ats_url;
  /** @type {import('./types.ts').PostingCheck} */
  const result = { consultation: 'unknown', availability: 'uncertain', reason: 'missing_original_url',
    checked_at: (options.now?.() ?? new Date()).toISOString(), requested_url: url, observed_url: null, redirect_url: null,
    facts: { company:null, job_title:null, location:null, remote_eligibility:null, compensation_text:null },
    source_urls:[], notes:[], work_arrangement:null, field_sources:{}, incomplete:false,
    application: { status:'not_established', url:null } };
  if (!url) return result;
  const target = checkTarget(url);
  if (!target) return { ...result, reason: 'unsupported_check_destination' };
  if (options.signal.aborted) return { ...result, reason: 'run_deadline', incomplete:true };
  const controller = new AbortController();
  const abort = () => controller.abort(); options.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, Math.min(options.timeoutMs ?? LIMITS.verificationTimeoutMs, LIMITS.verificationTimeoutMs));
  let requests = 0;
  /** @type {typeof fetch} */
  const boundedFetch = (input, init) => {
    controller.signal.throwIfAborted();
    if (++requests > 3) throw new Error('Verification request limit.');
    result.source_urls.push(String(input));
    return options.fetcher(input,init);
  };
  let response;
  try {
    try {
      const preview = await ingestPosting(target,{fetcher:boundedFetch,signal:controller.signal,now:options.now?.()});
      const d = preview.draft;
      result.facts = { company:d.company ?? null, job_title:d.title ?? null, location:d.location ?? null,
        // Work arrangement is not geographic remote eligibility. Never infer the latter.
        remote_eligibility:null, compensation_text:d.compensation_text ?? null };
      result.work_arrangement = d.work_arrangement ?? null;
      result.field_sources = Object.fromEntries(Object.entries(preview.field_sources).filter(([key])=>['company','title','location','work_arrangement','compensation_text'].includes(key)));
      result.notes = preview.warnings.slice(0,20).map(w=>w.slice(0,1000));
      result.availability = d.title ? 'appears_available' : 'uncertain';
      result.reason = d.title ? 'structured_posting_retrieved' : 'structured_identity_incomplete';
    } catch (error) {
      if (controller.signal.aborted) return {...result,reason:'timeout_or_cancelled',incomplete:true};
      if (error instanceof IngestionError && error.code === 'unavailable') return {...result,availability:'unavailable',reason:'structured_posting_unavailable'};
      result.reason='retrieval_inconclusive';
    }
    // Static HTML can contradict availability or establish application evidence, never promote it.
    response = await boundedFetch(target,{method:'GET',redirect:'manual',signal:controller.signal,headers:{Accept:'text/html'}});
    result.observed_url=target;
    if ([404,410].includes(response.status)) return {...result,availability:'unavailable',reason:`http_${response.status}`};
    if (response.status >= 300 && response.status < 400) {
      const location=response.headers.get('location');
      try { result.redirect_url=location ? safeUrl(new URL(location,target).href) : null; } catch { /* Invalid observed redirect. */ }
      if (result.availability==='uncertain') result.reason='redirect_not_followed';
    }
    if (response.ok && response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
      const observation = inspectHtml(await readBounded(response,LIMITS.verificationBytes,controller.signal),target,result.facts.company ?? '',result.facts.job_title ?? '');
      if (observation.availability === 'unavailable') return {...result,availability:'unavailable',reason:observation.reason};
      result.application = observation.application;
      if (result.availability==='uncertain') result.reason=observation.reason;
    }
    result.incomplete = controller.signal.aborted;
    return result;
  } catch (error) {
    if (controller.signal.aborted) return {...result,reason:'timeout_or_cancelled',incomplete:true};
    if (error instanceof IngestionError && error.code === 'unavailable') return {...result,availability:'unavailable',reason:'structured_posting_unavailable'};
    // Structured facts already obtained survive failure of the optional HTML observation.
    return {...result,reason:result.availability === 'appears_available' ? 'structured_posting_html_unreadable' : 'retrieval_inconclusive'};
  } finally { clearTimeout(timer); options.signal.removeEventListener('abort',abort); await response?.body?.cancel().catch(() => {}); }
}
