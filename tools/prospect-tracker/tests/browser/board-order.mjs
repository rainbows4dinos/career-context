// Run with the synthetic radar-server.js on 8777 and isolated Chrome CDP on 9229.
// Real browser + vendored Supabase SDK + disposable PostgreSQL. No hosted data.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const endpoint = await (await fetch('http://127.0.0.1:9229/json/version')).json();
const ws = new globalThis.WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const waiting = new Map();
let interceptedDrag;
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Input.dragIntercepted') interceptedDrag = message.params.data;
  if (!message.id) return;
  const pending = waiting.get(message.id); waiting.delete(message.id);
  if (message.error) pending.reject(new Error(JSON.stringify(message.error))); else pending.resolve(message.result);
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++sequence; waiting.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const call = (method, params) => send(method, params, sessionId);
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    try { if (await evaluate(expression)) return; } catch { /* navigation may replace the context */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out: ' + expression);
}
const url = 'http://127.0.0.1:8777/tools/prospect-tracker/index.html';
const ids = Array.from({ length: 6 }, (_, i) => `${String(i + 1).repeat(8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`);
const order = () => evaluate("[...document.querySelectorAll('[data-column-id=prospects] .prospect-card')].map(card=>card.dataset.prospectId)");
async function ready() { await wait("!!document.querySelector('.board') && document.querySelectorAll('.prospect-card').length===6"); }
async function refresh() { await evaluate('window.fixtureReloading=true'); await call('Page.reload', {}); await wait('!window.fixtureReloading'); await ready(); }
async function key(id, key) {
  await evaluate(`document.querySelector('[data-prospect-id="${id}"]').focus()`);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, modifiers: 1, windowsVirtualKeyCode: key === 'ArrowUp' ? 38 : 40 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, modifiers: 1 });
}
async function settled() { await wait("document.getElementById('workspace').getAttribute('aria-busy')!=='true'"); }
async function drag(id, destination, beforeId = null) {
  // Native DragEvents exercise the exact browser handlers with realistic coordinates.
  return evaluate(`(()=>{
    const source=document.querySelector('[data-prospect-id="${id}"]'); const transfer=new DataTransfer();
    const start=new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer});source.dispatchEvent(start);
    const column=document.querySelector('[data-column-id="${destination}"]');
    const before=${beforeId ? `document.querySelector('[data-prospect-id="${beforeId}"]')` : 'null'};
    const box=(before??column.querySelector('.column-cards')).getBoundingClientRect();
    const y=before?box.top+2:box.bottom-2;
    column.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer,clientY:y}));
    const marker=document.querySelector('.board-insertion');const feedback=!!marker && getComputedStyle(marker).height==='3px';
    column.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientY:y}));
    source.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:transfer}));
    const active=document.querySelector('[data-prospect-id="${id}"]');
    const click=new MouseEvent('click',{bubbles:true,cancelable:true});if('${destination}'==='prospects')active?.dispatchEvent(click);
    return {feedback,suppressed:click.defaultPrevented,started:!start.defaultPrevented};
  })()`);
}
try {
  await call('Page.enable', {}); await call('Network.enable', {});
  await call('Network.setBlockedURLs', { urls: ['https://*'] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url });
  await wait("!!document.querySelector('.board') || !document.getElementById('login').hidden");
  await evaluate(`(async()=>{
    const {getRadarClient}=await import('./supabase-client.js');window.fixtureClient=await getRadarClient();
    const {error}=await fixtureClient.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});if(error)throw error;
    const {createRadarDataAccess}=await import('./data.js');window.fixtureData=createRadarDataAccess(fixtureClient);
    const ids=${JSON.stringify(ids)};
    for(let i=0;i<ids.length;i++){const existing=await fixtureData.getProspect(ids[i]);if(existing){await fixtureData.changeStatus(existing.id,['prospect','interested','applying','prospect','applied','closed'][i],existing.updated_at);continue;}await fixtureData.createProspect({id:ids[i],company:['Alpha','Beta','Gamma','Delta','Applied','Done'][i],title:'Designer',status:['prospect','interested','applying','prospect','applied','closed'][i]});}
    const current=(await fixtureData.listProspects()).filter(card=>['prospect','interested','applying'].includes(card.status)).map(card=>card.id);await fixtureData.reorderColumn('prospects',current,ids.slice(0,4).reverse());
  })()`);
  await refresh();
  assert.deepEqual(await order(), ids.slice(0,4).toReversed());
  const historyExpression = `(async()=>{const {createRadarDataAccess}=await import('./data.js');const d=createRadarDataAccess(await (await import('./supabase-client.js')).getRadarClient());return Promise.all((await d.listProspects()).map(card=>d.listStatusEvents(card.id)))})()`;
  const originalHistory = await evaluate(historyExpression);
  await key(ids[0], 'ArrowUp'); await settled();
  assert.deepEqual(await order(), [ids[3],ids[2],ids[0],ids[1]]);
  assert.equal(await evaluate('document.activeElement.dataset.prospectId'), ids[0]);
  await refresh(); assert.deepEqual(await order(), [ids[3],ids[2],ids[0],ids[1]]);
  // Filtering preserves the saved subsequence and disables both reorder input paths.
  await evaluate("const input=document.getElementById('board-search');input.value='a';input.dispatchEvent(new Event('input',{bubbles:true}))");
  await key(ids[1], 'ArrowUp'); await settled();
  const filtered = await order();
  const blocked = await drag(ids[1], 'prospects', ids[3]); assert.equal(blocked.feedback, false);
  assert.deepEqual(await order(), filtered);
  await evaluate("document.querySelector('[aria-label=\"Clear search\"]').click()");
  assert.deepEqual(await order(), [ids[3],ids[2],ids[0],ids[1]]);
  const result = await drag(ids[1], 'prospects', ids[3]);
  assert.equal(result.started, true); assert.equal(result.feedback, true); assert.equal(result.suppressed, true);
  await settled(); assert.deepEqual(await order(), [ids[1],ids[3],ids[2],ids[0]]);
  assert.ok((await evaluate('location.hash')).includes('board') || await evaluate('location.hash') === '');
  await refresh(); assert.deepEqual(await order(), [ids[1],ids[3],ids[2],ids[0]]);
  const history = await evaluate(`(async()=>{const {createRadarDataAccess}=await import('./data.js');const d=createRadarDataAccess(await (await import('./supabase-client.js')).getRadarClient());return Promise.all((await d.listProspects()).map(card=>d.listStatusEvents(card.id)))})()`);
  assert.deepEqual(history.flat().sort((a,b)=>a.id-b.id), originalHistory.flat().sort((a,b)=>a.id-b.id));
  // Failure leaves the persisted order intact and presents feedback.
  await evaluate("fetch('/__fixture/fail-next-save',{method:'POST'})");
  await key(ids[1], 'ArrowDown'); await settled();
  assert.deepEqual(await order(), [ids[1],ids[3],ids[2],ids[0]]);
  await wait("document.body.textContent.includes('Could not save card order')");
  // Keep the existing cross-column status move and Done outcome chooser.
  await drag(ids[0], 'applied'); await settled();
  assert.equal(await evaluate(`document.querySelector('[data-column-id=applied] .prospect-card').dataset.prospectId`), ids[0]);
  await drag(ids[0], 'done'); await wait("!!document.querySelector('.kanban-outcome')");
  await evaluate("[...document.querySelectorAll('.kanban-outcome button')].find(b=>b.textContent==='Cancel').click()");
  await evaluate("document.querySelector('[data-column-id=done]').open=true");
  assert.equal(await evaluate("document.querySelectorAll('[data-column-id=done] .prospect-card').length"), 1);
  // Desktop and narrow layouts retain their existing dimensions and scrolling.
  for (const light of [false,true]) for (const width of [1440, 900, 600, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.body.classList.toggle('light',${light})`);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await key(ids[2], 'ArrowDown'); await settled();
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate('document.body.classList.remove("light")');
  // Exercise a trusted mouse gesture through Chromium's native drag pipeline too.
  const beforeNative = await order();
  const sourceId = beforeNative.at(-1); const targetId = beforeNative[0];
  const boxes = await evaluate(`(()=>{const a=document.querySelector('[data-prospect-id="${sourceId}"]'),b=document.querySelector('[data-prospect-id="${targetId}"]');a.scrollIntoView({block:'nearest'});const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return {x:x.left+30,y:x.top+30,targetX:y.left+30,targetY:y.top+2}})()`);
  await call('Input.setInterceptDrags', { enabled: true });
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: boxes.x, y: boxes.y });
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: boxes.x, y: boxes.y, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: boxes.x + 15, y: boxes.y - 15, button: 'left', buttons: 1 });
  for (let n = 0; n < 50 && !interceptedDrag; n++) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(interceptedDrag, 'trusted native drag started');
  for (const type of ['dragEnter','dragOver']) await call('Input.dispatchDragEvent', { type, x: boxes.targetX, y: boxes.targetY, data: interceptedDrag });
  assert.equal(await evaluate("!!document.querySelector('.board-insertion')"), true);
  assert.equal(await evaluate("(()=>{const marker=document.querySelector('.board-insertion'),list=marker.parentElement,m=marker.getBoundingClientRect(),b=list.getBoundingClientRect();return m.top>=b.top && m.bottom<=b.bottom})()"), true, 'insertion indicator is visible inside the scrolling list');
  const insertionShot = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/nextchapter-board-insertion.png', Buffer.from(insertionShot.data, 'base64'));
  await call('Input.dispatchDragEvent', { type: 'drop', x: boxes.targetX, y: boxes.targetY, data: interceptedDrag });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: boxes.targetX, y: boxes.targetY, button: 'left', clickCount: 1 });
  await call('Input.setInterceptDrags', { enabled: false });
  await settled();
  assert.deepEqual(await order(), [sourceId, ...beforeNative.filter(id => id !== sourceId)]);
  await refresh();
  assert.deepEqual(await order(), [sourceId, ...beforeNative.filter(id => id !== sourceId)]);

  const shot = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/nextchapter-board-order.png', Buffer.from(shot.data, 'base64'));
  console.log('Passed persisted drag and keyboard ordering, filter lock, click suppression, history isolation, failure recovery, status moves, Done chooser, both themes and responsive widths.');
} finally { await send('Target.closeTarget', { targetId }); ws.close(); }
