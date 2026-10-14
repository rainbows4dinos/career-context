// Local synthetic fixture + isolated Chrome CDP on ports 8777/9229. No hosted data.
import assert from 'node:assert/strict';
const endpoint=await (await fetch('http://127.0.0.1:9229/json/version')).json();
const ws=new globalThis.WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const waiting=new Map(),dialogs=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=waiting.get(m.id);waiting.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}if(m.method==='Page.javascriptDialogOpening'){const accept=dialogs.get(m.sessionId)??true;send('Page.handleJavaScriptDialog',{accept},m.sessionId).catch(()=>{});}});
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const key=++id;waiting.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params,...(sessionId?{sessionId}:{})}));});}
async function page(url){const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Page.enable',{},sessionId);await send('Network.enable',{},sessionId);await send('Network.setBlockedURLs',{urls:['https://*']},sessionId);if(url)await send('Page.navigate',{url},sessionId);return {targetId,sessionId};}
async function evaluate(p,expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true},p.sessionId);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value;}
async function wait(p,expression){for(let n=0;n<100;n++){try{if(await evaluate(p,expression))return;}catch(e){if(!/navigated|context/.test(e.message))throw e;}await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+expression);}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = 'http://127.0.0.1:8777/career-context/tools/';
const builder = await page(base + 'resume-tailor.html');
let tracker;
try {
  await wait(builder, "typeof goTailor === 'function' && !!document.querySelector('.theme-toggle')");
  await evaluate(builder, '(async()=>{await fieldUI; await statusUI; await notificationUI})()');
  await evaluate(builder, 'goTailor()');
  assert.equal(await evaluate(builder, "document.activeElement.id"), 'jobTitle');
  assert.deepEqual(await evaluate(builder, "['jobTitle','jobDesc'].map(id=>{const input=document.getElementById(id);return [input.getAttribute('aria-invalid'),!!document.getElementById(input.getAttribute('aria-describedby'))]})"), [['true', true], ['true', true]]);
  await evaluate(builder, "jobTitle.value='Synthetic Designer';jobTitle.dispatchEvent(new Event('input',{bubbles:true}));jobDesc.value='Synthetic posting';jobDesc.dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate(builder, "document.querySelectorAll('[aria-invalid]').length"), 0);
  const long = 'Synthetic description 😀\n<script>inert text</script>\n'.repeat(4000);
  assert.equal(await evaluate(builder, `jobDesc.value=${JSON.stringify(long)};jobDesc.value`), long);
  await evaluate(builder, `(async()=>{
    const ui=await fieldUI;const form=document.createElement('form');form.id='specimens';
    form.innerHTML='<div class="nc-field"><label class="nc-field__label" for="spec-input">Input</label><input class="nc-input" id="spec-input" required placeholder="Example" aria-describedby="spec-help"><span id="spec-help" class="nc-field__helper">Persistent helper</span></div><div class="nc-field"><label class="nc-field__label" for="spec-area">Textarea</label><textarea class="nc-textarea" id="spec-area" required placeholder="Example"></textarea></div><div class="nc-field"><label class="nc-field__label" for="spec-select">Select</label><span class="nc-select-wrap"><select class="nc-select" id="spec-select" required><option value="">Not specified</option><option value="one">One</option><option value="two">Two</option></select></span></div>';
    form.addEventListener('submit',event=>event.preventDefault());document.querySelector('.shell').append(form);ui.bindFieldValidation(form);
    window.resolveColor=name=>{const probe=document.createElement('span');probe.style.color='var(--nc-'+name+')';document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;};
  })()`);
  await send('DOM.enable', {}, builder.sessionId); await send('CSS.enable', {}, builder.sessionId);
  for (const light of [false, true]) {
    await evaluate(builder, `document.body.classList.toggle('light',${light})`);
    const { root } = await send('DOM.getDocument', {}, builder.sessionId);
    for (const id of ['spec-input', 'spec-area', 'spec-select']) {
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id }, builder.sessionId);
      for (const state of ['placeholder', 'filled', 'hover', 'focus', 'error', 'disabled']) {
        await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: state === 'hover' ? ['hover'] : [] }, builder.sessionId);
        const values = await evaluate(builder, `(async()=>{const input=document.getElementById('${id}');const ui=await fieldUI;
          input.disabled=false;input.value='${id==='spec-select'?'one':'Entered content'}';ui.setFieldError(input,'');input.blur();
          if('${state}'==='placeholder')input.value='';if('${state}'==='focus')input.focus();if('${state}'==='error')ui.setFieldError(input,'Persistent field error.');if('${state}'==='disabled')input.disabled=true;
          const c=getComputedStyle(input);return {color:c.color,expected:resolveColor('${state==='disabled'?'action-disabled-fg':id==='spec-select'&&state==='placeholder'?'text-placeholder':'text-primary'}'),border:c.borderTopColor,expectedBorder:resolveColor('${state==='error'?'danger-fg':'border-control'}'),width:c.borderTopWidth,outline:c.outlineWidth,offset:c.outlineOffset,placeholder:getComputedStyle(input,'::placeholder').color,expectedPlaceholder:resolveColor('text-placeholder'),resize:c.resize,associated:input.labels[0]?.htmlFor===input.id};})()`);
        assert.equal(values.color, values.expected, `${id} ${state} ${light?'light':'dark'} text`);
        assert.equal(values.border, values.expectedBorder); assert.equal(values.width, '1px'); assert.equal(values.associated, true);
        if (state === 'focus') { assert.equal(values.outline, '2px'); assert.equal(values.offset, '2px'); }
        if (id !== 'spec-select' && state !== 'disabled') assert.equal(values.placeholder, values.expectedPlaceholder);
        if (id === 'spec-area') assert.equal(values.resize, 'vertical');
      }
      await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }, builder.sessionId);
    }
    const alerts = await evaluate(builder, `(async()=>{const {setAlert}=await statusUI;return ['success','danger','warning','info'].map(variant=>{const alert=document.createElement('div');document.querySelector('.shell').append(alert);setAlert(alert,{variant,message:('Long contextual message '+variant+'\\n').repeat(12),announcement:variant==='danger'?'assertive':'off'});const c=getComputedStyle(alert);const result={variant,padding:c.padding,height:alert.getBoundingClientRect().height,color:c.color,expected:resolveColor(variant+'-fg'),role:alert.getAttribute('role'),stroke:c.borderTopWidth};alert.remove();return result;});})()`);
    for (const alert of alerts) { assert.equal(alert.padding, '8px'); assert.ok(alert.height > 100); assert.equal(alert.color, alert.expected); assert.equal(alert.stroke, '1px'); assert.equal(alert.role, alert.variant === 'danger' ? 'alert' : null); }
  }
  await evaluate(builder, "(async()=>{const ui=await fieldUI;for(const input of document.querySelectorAll('#specimens input,#specimens textarea,#specimens select')){input.disabled=false;input.value='';ui.setFieldError(input,'');}document.getElementById('specimens').requestSubmit()})()");
  assert.equal(await evaluate(builder, "document.querySelectorAll('#specimens [aria-invalid=true]').length"), 3);
  await evaluate(builder, "document.getElementById('spec-input').value='Corrected';document.getElementById('spec-input').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate(builder, "document.getElementById('spec-input').getAttribute('aria-describedby')"), 'spec-help');
  await evaluate(builder, "document.getElementById('specimens').reset()");
  assert.equal(await evaluate(builder, "document.querySelectorAll('#specimens [aria-invalid]').length"), 0);
  console.log('PASS both themes: 36 input states, native validation, label/error/helper associations, error clearing/reset, long text, flexible Alerts');

  // Both modes preserve the Toast's raised surface and primary label, independently of severity.
  for (const light of [false,true]) {
    await evaluate(builder, `document.body.classList.toggle('light',${light})`);
    const colors = await evaluate(builder, `(async()=>{window.toastUI=await notificationUI;return ['success','danger','warning','info'].map(variant=>{
      const id=toastUI.showToast({variant,message:'Color specimen '+variant,duration:0,dismissible:variant!=='info'});
      return id;
    });})()`);
    for (const id of colors) {
      await wait(builder, `!!document.querySelector('[data-toast-id="${id}"]')`);
      const result = await evaluate(builder, `(()=>{const toast=document.querySelector('[data-toast-id="${id}"]'),c=getComputedStyle(toast);return {color:c.color,expected:resolveColor('text-primary'),background:c.backgroundColor,raised:resolveColor('surface-raised'),border:c.borderTopColor,control:resolveColor('border-control'),width:c.borderTopWidth,shadow:c.boxShadow};})()`);
      assert.equal(result.color,result.expected); assert.equal(result.background,result.raised); assert.equal(result.border,result.control); assert.equal(result.width,'1px'); assert.ok(result.shadow.includes('1px 1px 0px'));
      await evaluate(builder, `toastUI.dismissToast('${id}')`);
    }
    await wait(builder, "document.querySelectorAll('.nc-toast').length===0");
  }
  // Each test controls its own notifications; no application data is needed.
  await evaluate(builder, "(async()=>{window.toastUI=await notificationUI;window.toastIds=[];jobTitle.focus();for(let i=0;i<5;i++)toastIds.push(toastUI.showToast({variant:'warning',message:'Queued '+i}));window.duplicateId=toastUI.showToast({variant:'warning',message:'Queued 0'})})()");
  assert.equal(await evaluate(builder, 'duplicateId===toastIds[0]'), true);
  assert.equal(await evaluate(builder, "document.activeElement.id"), 'jobTitle');
  assert.equal(await evaluate(builder, "document.querySelectorAll('.nc-toast').length"), 3);
  await sleep(80);
  assert.equal(await evaluate(builder, "document.querySelectorAll('.nc-toast [role=status]').length"), 3);
  await evaluate(builder, "document.querySelector('.nc-toast__dismiss').click()");
  await wait(builder, "!document.querySelector('[data-toast-id=\"'+toastIds[0]+'\"]') && document.querySelectorAll('.nc-toast').length===3");
  assert.deepEqual(await evaluate(builder, "[...document.querySelectorAll('.nc-toast__message')].map(node=>node.textContent)"), ['Queued 1', 'Queued 2', 'Queued 3']);
  await evaluate(builder, "toastIds.forEach(toastUI.dismissToast)"); await wait(builder, "document.querySelectorAll('.nc-toast').length===0");
  await evaluate(builder, "window.focusToast=toastUI.showToast({message:'Focus pauses timeout',duration:150});document.querySelector('.nc-toast__dismiss').focus()");
  await sleep(500); assert.equal(await evaluate(builder, "document.querySelectorAll('.nc-toast').length"), 1);
  await evaluate(builder, "jobTitle.focus()"); await wait(builder, "document.querySelectorAll('.nc-toast').length===0");
  await evaluate(builder, "window.hoverToast=toastUI.showToast({message:'Hover pauses timeout',duration:150,dismissible:false});document.querySelector('.nc-toast').dispatchEvent(new Event('pointerenter'))");
  await sleep(500); assert.equal(await evaluate(builder, "document.querySelectorAll('.nc-toast__dismiss').length"), 0);
  assert.equal(await evaluate(builder, "document.querySelectorAll('.nc-toast').length"), 1);
  await evaluate(builder, "document.querySelector('.nc-toast').dispatchEvent(new Event('pointerleave'))"); await wait(builder, "document.querySelectorAll('.nc-toast').length===0");
  await evaluate(builder, "window.persistent=toastUI.showToast({variant:'danger',message:'Persistent danger'});jobTitle.focus();document.querySelector('.nc-toast__dismiss').focus()");
  await sleep(300); assert.equal(await evaluate(builder, "document.querySelectorAll('.nc-toast').length"), 1);
  assert.equal(await evaluate(builder, "document.querySelector('.nc-toast [role=alert]').textContent"), 'danger: Persistent danger');
  await send('Page.bringToFront',{},builder.sessionId);
  await send('Input.dispatchKeyEvent', { type:'keyDown', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, text:'\r' }, builder.sessionId);
  await send('Input.dispatchKeyEvent', { type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13 }, builder.sessionId);
  await wait(builder, "document.querySelectorAll('.nc-toast').length===0"); assert.equal(await evaluate(builder, "document.activeElement.id"), 'jobTitle');
  await send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] }, builder.sessionId);
  await evaluate(builder, "window.mobileToast=toastUI.showToast({message:'Multiline '+('word '.repeat(80)),duration:0});document.getElementById('specimens').remove()");
  await send('Network.setBlockedURLs',{urls:[]},builder.sessionId);
  await evaluate(builder, "Promise.all([...document.querySelectorAll('link[rel=stylesheet][href*=\"fonts.googleapis.com\"]')].map(link=>new Promise(resolve=>{link.onload=resolve;link.onerror=resolve;link.href+='&phase2b-check=1'})))");
  await evaluate(builder, 'document.fonts.ready');
  for (const width of [320,390,1280]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:width<600}, builder.sessionId);
    const geometry = await evaluate(builder, "(()=>{const toast=document.querySelector('.nc-toast'),close=toast.querySelector('button'),rect=toast.getBoundingClientRect(),c=getComputedStyle(toast),spinner=getComputedStyle(document.querySelector('.nc-spinner'));return {left:rect.left,right:rect.right,height:rect.height,close:close.getBoundingClientRect().width,transform:c.transform,spinner:spinner.animationName,stroke:spinner.borderTopWidth,size:spinner.width};})()");
    assert.ok(geometry.left>=15 && geometry.right<=width-15); assert.ok(geometry.height>50); assert.equal(geometry.close,24); assert.equal(geometry.transform,'none'); assert.equal(geometry.spinner,'none'); assert.equal(geometry.stroke,'2px'); assert.equal(geometry.size,'28px');
  }
  await evaluate(builder, 'toastUI.dismissToast(mobileToast)'); await wait(builder, "document.querySelectorAll('.nc-toast').length===0");
  console.log('PASS Toast max-three/queue/order/dedup/manual/timeout/persistence, focus and hover pause, optional close, keyboard return focus, mobile wrapping and reduced motion');

  await evaluate(builder, `(async()=>{
    window.nativeFetch=window.fetch;contextLoaded=true;MASTER='Synthetic';FRAMING='';VOICE='';RULES={};
    jobTitle.value='Synthetic Designer';jobDesc.value='Synthetic posting';
    window.fetch=async()=>new Response('Synthetic generation failure',{status:500});await goTailor();
  })()`);
  await wait(builder, "document.getElementById('generationError').classList.contains('nc-alert--danger')");
  assert.equal(await evaluate(builder, "document.querySelector('.loading-card > .nc-spinner').hidden"), true);
  assert.equal(await evaluate(builder, "document.getElementById('generationError').getAttribute('role')"), 'alert');
  await evaluate(builder, "document.getElementById('retryBtn').click()");
  assert.equal(await evaluate(builder, "document.getElementById('pane0').style.display"), '');
  await evaluate(builder, `(async()=>{
    jobTitle.value='Synthetic Designer';company.value='Synthetic Co';jobDesc.value='Synthetic posting';
    const output={resume:{summary:'Synthetic summary.',skills:{product_ux:['Design'],ai_prototyping:[],leadership:[]},experience:[]},cover_letter:{opening_paragraph:'Synthetic letter.',body_paragraphs:[],closing_paragraph:'Thank you.'},tailoring_notes:'Synthetic only'};
    window.fetch=async()=>new Response('data: '+JSON.stringify({type:'content_block_delta',delta:{type:'text_delta',text:JSON.stringify(output)}})+'\\n\\ndata: [DONE]\\n\\n');await goTailor();
  })()`);
  await wait(builder, "!!generatedData && document.getElementById('pane2').style.display===''");
  assert.equal(await evaluate(builder, "document.querySelector('.nc-toast__message').textContent"), 'Résumé and cover letter ready.');
  await evaluate(builder, "goRevise()");
  assert.equal(await evaluate(builder, "document.getElementById('reviseNote').getAttribute('aria-invalid')"), 'true');
  await evaluate(builder, "document.getElementById('reviseNote').value=' ';document.getElementById('reviseNote').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate(builder, "document.getElementById('reviseNote').getAttribute('aria-invalid')"), 'true');
  await evaluate(builder, "document.getElementById('reviseNote').value='Synthetic revision';window.fetch=async()=>Response.json({error:{message:'Synthetic revision failure'}});goRevise()");
  await wait(builder, "document.getElementById('revisionError').classList.contains('nc-alert--danger')");
  assert.equal(await evaluate(builder, "document.querySelector('#reviseStatus .nc-spinner').hidden"), true);
  await sleep(3200);
  assert.equal(await evaluate(builder, "document.getElementById('revisionError').textContent.includes('Synthetic revision failure')"), true);
  await evaluate(builder, "window.fetch=window.nativeFetch;startOver()");
  assert.equal(await evaluate(builder, "document.getElementById('revisionError').textContent"), '');
  console.log('PASS Builder generation/retry/success Toast, persistent revision failure, blank/whitespace revision errors, stopped spinners and Start New');

  tracker = await page(base + 'prospect-tracker/');
  await wait(tracker, "!!document.querySelector('.board') || !document.getElementById('login').hidden");
  if (await evaluate(tracker, "!document.getElementById('login').hidden")) {
    await evaluate(tracker, "document.getElementById('login-form').requestSubmit()");
    assert.equal(await evaluate(tracker, "document.querySelectorAll('#login-form [aria-invalid=true]').length"), 2);
    await evaluate(tracker, "document.getElementById('login-email').value='radar@example.invalid';document.getElementById('login-password').value='fixture-only-password';document.getElementById('login-form').requestSubmit()");
    await wait(tracker, "!!document.querySelector('.board')");
  }
  await evaluate(tracker, "location.hash='#/prospects/new'"); await wait(tracker, "!!document.getElementById('prospect-form')");
  const before = await (await fetch('http://127.0.0.1:8777/__fixture')).json();
  await evaluate(tracker, "document.getElementById('prospect-form').requestSubmit()");
  assert.equal(await evaluate(tracker, "document.querySelectorAll('#prospect-form [aria-invalid=true]').length"), 2);
  assert.deepEqual(await (await fetch('http://127.0.0.1:8777/__fixture')).json(), before);
  await evaluate(tracker, "document.querySelector('[name=company]').value='Phase 2B Synthetic';document.querySelector('[name=title]').value='Designer';document.querySelector('[name=job_url]').value='ftp://example.invalid/job';document.getElementById('prospect-form').requestSubmit()");
  await wait(tracker, "document.querySelector('[name=job_url]').getAttribute('aria-invalid')==='true' && !document.querySelector('#prospect-form button[type=submit]').disabled");
  assert.deepEqual(await (await fetch('http://127.0.0.1:8777/__fixture')).json(), before);
  await evaluate(tracker, "document.querySelector('[name=job_url]').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate(tracker, "document.querySelector('[name=job_url]').getAttribute('aria-invalid')"), 'true');
  await evaluate(tracker, "document.querySelector('[name=job_url]').value='https://example.invalid/job';document.querySelector('[name=job_url]').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate(tracker, "document.querySelector('[name=job_url]').hasAttribute('aria-invalid')"), false);
  await evaluate(tracker, "document.querySelector('[name=company]').value='Phase 2B Synthetic';document.querySelector('[name=title]').value='Designer';document.querySelector('[name=job_description]').value='Complete description';document.getElementById('prospect-form').requestSubmit()");
  await wait(tracker, "!!document.getElementById('status-form')"); await wait(tracker, "[...document.querySelectorAll('.nc-toast__message')].some(node=>node.textContent==='Prospect saved.')");
  await evaluate(tracker, "document.querySelector('[name=notes]').value='Kept draft';document.getElementById('prospect-form').requestSubmit()");
  await wait(tracker, "[...document.querySelectorAll('.nc-toast__message')].some(node=>node.textContent==='Details saved.')");
  assert.equal(await evaluate(tracker, "document.getElementById('save-feedback').textContent"), '');
  await fetch('http://127.0.0.1:8777/__fixture/fail-next-save', {method:'POST'});
  await evaluate(tracker, "document.querySelector('[name=title]').value='Draft stays';document.getElementById('prospect-form').requestSubmit()");
  await wait(tracker, "document.getElementById('save-feedback').classList.contains('nc-alert--danger')");
  assert.equal(await evaluate(tracker, "document.querySelector('[name=title]').value"), 'Draft stays');
  assert.equal(await evaluate(tracker, "document.getElementById('save-feedback').getAttribute('role')"), 'alert');
  await evaluate(tracker, "document.getElementById('prospect-form').requestSubmit()");
  await wait(tracker, "!document.querySelector('#prospect-form button[type=submit]').disabled && document.getElementById('save-feedback').textContent===''");
  await evaluate(tracker, "document.querySelector('#status-form select').focus()");
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'a',code:'KeyA',text:'a',windowsVirtualKeyCode:65}, tracker.sessionId);
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65}, tracker.sessionId);
  assert.equal(await evaluate(tracker, "document.querySelector('#status-form select').value"), 'applied');
  await wait(tracker, "!document.querySelector('#status-form select').disabled && document.getElementById('status-feedback').textContent===''");
  await evaluate(tracker, "document.querySelector('#status-form select').value='applied';document.querySelector('#status-form select').dispatchEvent(new Event('change',{bubbles:true}))");
  await wait(tracker, "[...document.querySelectorAll('.nc-toast__message')].some(node=>node.textContent==='Status saved.')");
  await wait(tracker, "!document.querySelector('#status-form select').disabled");
  assert.equal(await evaluate(tracker, "document.getElementById('status-feedback').textContent"), '');
  await fetch('http://127.0.0.1:8777/__fixture/fail-next-save', {method:'POST'});
  await evaluate(tracker, "document.querySelector('[name=title]').value='Draft survives status failure';document.querySelector('[name=title]').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#status-form select').value='offer';document.querySelector('#status-form select').dispatchEvent(new Event('change',{bubbles:true}))");
  await wait(tracker, "document.getElementById('status-feedback').classList.contains('nc-alert--danger') && !document.querySelector('#status-form select').disabled");
  assert.equal(await evaluate(tracker, "document.querySelector('#status-form select').value"), 'applied');
  assert.equal(await evaluate(tracker, "document.querySelector('[name=title]').value"), 'Draft survives status failure');
  assert.equal(await evaluate(tracker, "getComputedStyle(document.querySelector('.nc-select-wrap > svg')).pointerEvents"), 'none');
  console.log('PASS Tracker auth/create/edit/save/error draft recovery/native select/Applied/status Toasts; invalid submissions do not write');
} finally {
  if (tracker) await send('Target.closeTarget', {targetId:tracker.targetId});
  await send('Target.closeTarget', {targetId:builder.targetId});
  ws.close();
}
