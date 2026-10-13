// Run with the disposable fixture on 8777 and isolated Chrome CDP on 9229.
// Uses only synthetic authentication; account/navigation changes must not write data.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const origin = 'http://127.0.0.1:8777';
const prefix = `${origin}/career-context/tools/`;
const endpoint = await (await fetch('http://127.0.0.1:9229/json/version')).json();
const socket = new globalThis.WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const pages = [];
const intercepted = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const task = pending.get(message.id); pending.delete(message.id);
    if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
  }
  if (message.method === 'Fetch.requestPaused') intercepted.set(message.sessionId, message.params.requestId);
});
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(page, expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, page.sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(page, expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if (await evaluate(page, expression)) return; } catch (error) { if (!/context|navigated/.test(error.message)) throw error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function page(url, pauseConfig = false) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const result = { targetId, sessionId }; pages.push(result);
  await send('Page.enable', {}, sessionId); await send('Network.enable', {}, sessionId);
  // No hosted auth, context or generation requests. Fonts are allowed for fit checks.
  await send('Network.setBlockedURLs', { urls: ['https://raw.githubusercontent.com/*', 'https://*.supabase.co/*', 'https://*.workers.dev/*'] }, sessionId);
  if (pauseConfig) await send('Fetch.enable', { patterns: [{ urlPattern: '*public-env.js' }] }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  await wait(result, "!!document.querySelector('#nextchapter-header nav')");
  return result;
}
async function reload(page) {
  const previous = await evaluate(page, 'performance.timeOrigin');
  await send('Page.reload', {}, page.sessionId);
  await wait(page, `performance.timeOrigin!==${previous}`);
}
async function accountReady(page, label = 'Log In') {
  await wait(page, `document.getElementById('nextchapter-account')?.textContent===${JSON.stringify(label)}`);
}
async function close(page) { await send('Target.closeTarget', { targetId: page.targetId }); pages.splice(pages.indexOf(page), 1); }
async function key(page, name, code, value, text) {
  await send('Page.bringToFront', {}, page.sessionId);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: value, ...(text ? { text } : {}) }, page.sessionId);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: value }, page.sessionId);
}
// Real pointer events verify visibility, hit targets and overlay stacking.
async function click(page, selector) {
  await send('Page.bringToFront', {}, page.sessionId);
  const point = await evaluate(page, `(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const box=el.getBoundingClientRect();const x=box.x+box.width/2,y=box.y+box.height/2;return {x,y,visible:box.width>0&&box.height>0&&el.contains(document.elementFromPoint(x,y))}})()`);
  assert.equal(point.visible, true, `Clickable target: ${selector}`);
  await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:point.x,y:point.y}, page.sessionId);
  await send('Input.dispatchMouseEvent', {type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1}, page.sessionId);
  await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1}, page.sessionId);
}
async function openUtilities(page, size) {
  await width(page, size);
  if (size < 1200) await click(page, '.nextchapter-menu-toggle');
}
async function width(page, value) {
  await send('Page.bringToFront', {}, page.sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: value, height: 800, deviceScaleFactor: 1, mobile: false }, page.sessionId);
  await evaluate(page, 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{window.scrollTo(0,0);resolve()})))');
}
const counters = await (await fetch(`${origin}/__fixture`)).json();
try {
  // Header must render before public configuration/session resolution.
  const delayed = await page(`${prefix}about.html`, true);
  await wait(delayed, "document.getElementById('nextchapter-account').disabled");
  assert.equal(await evaluate(delayed, "document.getElementById('nextchapter-account').getAttribute('aria-label')"), 'Checking account session');
  assert.equal(await evaluate(delayed, "document.querySelectorAll('nav[aria-label=\"Main navigation\"] a').length"), 4);
  while (!intercepted.has(delayed.sessionId)) await new Promise(resolve => setTimeout(resolve, 10));
  await send('Fetch.continueRequest', { requestId: intercepted.get(delayed.sessionId) }, delayed.sessionId);
  await send('Fetch.disable', {}, delayed.sessionId); await accountReady(delayed); await close(delayed);

  // Unavailable account configuration never blocks public Builder content.
  const unavailable = await page(`${prefix}resume-tailor.html`, true);
  while (!intercepted.has(unavailable.sessionId)) await new Promise(resolve => setTimeout(resolve, 10));
  await send('Fetch.fulfillRequest', { requestId: intercepted.get(unavailable.sessionId), responseCode: 404, body: '' }, unavailable.sessionId);
  await send('Fetch.disable', {}, unavailable.sessionId); await accountReady(unavailable, 'Retry account');
  assert.equal(await evaluate(unavailable, "document.getElementById('pane0').hidden"), false);
  await close(unavailable);

  const applications = [['radar', 'career-radar.html'], ['tracker', 'career-radar/'], ['builder', 'resume-tailor.html'], ['about', 'about.html']];
  for (const [app, path] of applications) {
    const p = await page(prefix + path); await accountReady(p);
    await evaluate(p, 'document.fonts.ready');
    assert.deepEqual(await evaluate(p, "[...document.querySelectorAll('nav[aria-label=\"Main navigation\"] a')].map(a=>a.href)"), applications.map(([, value]) => prefix + value));
    assert.equal(await evaluate(p, "document.querySelector('[aria-current=page]').textContent"), applications.find(([id]) => id === app)?.[0] === 'builder' ? 'Résumé Builder' : { radar: 'Career Radar', tracker: 'Prospect Tracker', about: 'About' }[app]);
    assert.equal(await evaluate(p, "!!document.getElementById('logout')"), false);
    if (app === 'tracker') assert.equal(await evaluate(p, "document.getElementById('workspace').hidden && !document.getElementById('login').hidden"), true);
    for (const theme of ['dark', 'light']) {
      await evaluate(p, `document.body.classList.toggle('light',${theme === 'light'})`);
      for (const size of [1512, 1200, 1080, 900, 899, 390, 320]) {
        await width(p, size);
        const geometry = await evaluate(p, `({overflow:document.documentElement.scrollWidth>innerWidth,top:document.getElementById('nextchapter-header').getBoundingClientRect().top,height:document.getElementById('nextchapter-header').getBoundingClientRect().height,fill:getComputedStyle(document.getElementById('nextchapter-header')).backgroundColor,current:getComputedStyle(document.querySelector('[aria-current=page]')).backgroundColor,weight:getComputedStyle(document.querySelector('[aria-current=page]')).fontWeight,switchWidth:document.querySelector('.toggle-track').getBoundingClientRect().width})`);
        assert.equal(geometry.overflow, false, `${app} ${theme} ${size}`); assert.equal(geometry.top, 0);
        assert.equal(geometry.height, size < 900 ? 64 : 80); assert.equal(geometry.fill, 'rgb(215, 205, 251)');
        assert.equal(geometry.current, 'rgb(248, 225, 182)'); assert.equal(geometry.weight, '500');
        if (size >= 900) assert.equal(geometry.switchWidth, 48);
      }
      await width(p, 390); await evaluate(p, "document.querySelector('.nextchapter-menu-toggle').focus()");
      await key(p, ' ', 'Space', 32, ' ');
      assert.equal(await evaluate(p, "document.querySelector('.nextchapter-menu-toggle').getAttribute('aria-expanded')"), 'true');
      assert.equal(await evaluate(p, "getComputedStyle(document.querySelector('#nextchapter-header nav')).display"), 'flex');
      assert.equal(await evaluate(p, "document.querySelector('.toggle-track').getBoundingClientRect().width"), 48);
      assert.equal(await evaluate(p, "document.getElementById('nextchapter-header').getBoundingClientRect().height>=800 && document.documentElement.scrollWidth===innerWidth"), true);
      await key(p, 'Tab', 'Tab', 9);
      await key(p, 'Escape', 'Escape', 27);
      assert.equal(await evaluate(p, "document.activeElement===document.querySelector('.nextchapter-menu-toggle') && document.activeElement.getAttribute('aria-expanded')==='false'"), true);
      assert.equal(await evaluate(p, "getComputedStyle(document.activeElement).outlineWidth"), '2px');
      await key(p, 'Enter', 'Enter', 13, '\r');
      // Resize resets disclosure and relocates focus to a visible control.
      await evaluate(p, "document.querySelector('.nextchapter-primary a').focus()"); await width(p, 1512);
      assert.equal(await evaluate(p, "document.activeElement.classList.contains('nextchapter-wordmark') && !document.getElementById('nextchapter-header').classList.contains('nextchapter-header--open')"), true);
      await width(p, 1080); await evaluate(p, "document.querySelector('.nextchapter-menu-toggle').focus()");
      await key(p, 'Enter', 'Enter', 13, '\r');
      assert.equal(await evaluate(p, "getComputedStyle(document.querySelector('.nextchapter-account-links')).display"), 'flex');
      assert.equal(await evaluate(p, "document.activeElement===document.querySelector('.nextchapter-account-links a')"), true);
      assert.deepEqual(await evaluate(p, `(()=>{const menu=document.querySelector('.nextchapter-menu-toggle');const panel=document.querySelector('.nextchapter-account-links');const button=menu.getBoundingClientRect();const box=panel.getBoundingClientRect();const css=getComputedStyle(panel);return [button.width,button.height,menu.querySelector('svg').getAttribute('width'),box.width,css.paddingTop,css.rowGap,css.borderRadius,box.top-button.bottom]})()`), [28,28,'12',180,'12px','12px','16px',7]);
      assert.equal(await evaluate(p, "document.querySelector('.nextchapter-menu-toggle use').getAttribute('href').endsWith('#ellipsis-vertical')"), true);
      await key(p, 'Escape', 'Escape', 27);
      assert.equal(await evaluate(p, "getComputedStyle(document.querySelector('.nextchapter-account-links')).display"), 'none');
      assert.equal(await evaluate(p, "document.activeElement===document.querySelector('.nextchapter-menu-toggle')"), true);
    }
    // Click outside the utility panel, including inside the header, dismisses it.
    await width(p,1080); await evaluate(p,"document.querySelector('.nextchapter-menu-toggle').click();document.querySelector('.theme-toggle').click()");
    assert.equal(await evaluate(p,"document.querySelector('.nextchapter-menu-toggle').getAttribute('aria-expanded')"),'false');
    await evaluate(p,"document.querySelector('.nextchapter-menu-toggle').click();document.querySelector('.nextchapter-primary a').focus()");
    await wait(p,"document.querySelector('.nextchapter-menu-toggle').getAttribute('aria-expanded')==='false'");
    await width(p, 390); await evaluate(p, "document.querySelector('.nextchapter-menu-toggle').click()");
    await evaluate(p, "document.querySelector('.theme-toggle').click()");
    const stored = await evaluate(p, "localStorage.getItem('theme')");
    await reload(p); await accountReady(p);
    assert.equal(await evaluate(p, "document.body.classList.contains('light')"), stored === 'light');
    // Follow About with real pointer events in every responsive layout.
    await evaluate(p, "document.querySelector('.nextchapter-menu-toggle').click()");
    for (const size of [1512, 1080, 390]) {
      await send('Page.navigate', {url: prefix + path}, p.sessionId); await accountReady(p);
      await openUtilities(p, size);
      const before = await evaluate(p, 'performance.timeOrigin');
      await click(p, '.nextchapter-account-links a');
      await wait(p, `performance.timeOrigin!==${before} && document.getElementById('nextchapter-header')?.dataset.app==='about' && document.querySelector('.nextchapter-menu-toggle')?.getAttribute('aria-expanded')==='false'`);
      assert.equal(await evaluate(p, 'location.href'), prefix + 'about.html');
    }
    await close(p);
  }
  console.log('Passed four destinations, both themes, seven widths, disclosures, keyboard focus and public access.');

  for (const [app, path] of applications) for (const size of [1512, 1080, 390]) {
    console.log('Account flow',app,size);
    const original = prefix + path + (app === 'tracker' ? '#/prospects/new' : '?source=synthetic#intro');
    const p = await page(original); await accountReady(p);
    await openUtilities(p, size);
    await click(p, '#nextchapter-account');
    await wait(p, "document.getElementById('login') && !document.getElementById('login').hidden");
    if (app === 'tracker') {
      assert.equal(await evaluate(p, 'location.href'), original);
      assert.equal(await evaluate(p, 'document.activeElement.id'), 'login-email');
    } else assert.equal(await evaluate(p, "new URL(location.href).searchParams.get('returnTo')"), original);
    if (app === 'radar') {
      await evaluate(p, "document.getElementById('login-email').value='radar@example.invalid';document.getElementById('login-password').value='wrong-password';document.getElementById('login-form').requestSubmit()");
      await wait(p, "document.getElementById('login-error').textContent.includes('synthetic fixture account')");
      assert.equal(await evaluate(p, "new URL(location.href).searchParams.get('returnTo')"), original);
    }
    assert.equal(await evaluate(p, "(async()=>{const client=await import('./supabase-client.js');return client.getRadarClient()===client.getRadarClient()})()"), true);
    await evaluate(p, "document.getElementById('login-email').value='radar@example.invalid';document.getElementById('login-password').value='fixture-only-password';document.getElementById('login-form').requestSubmit()");
    await wait(p, `location.href===${JSON.stringify(original)} && document.getElementById('nextchapter-account')?.textContent==='Log Out'`);
    await reload(p); await accountReady(p, 'Log Out');
    const tracker = await page(prefix + 'career-radar/'); await accountReady(tracker, 'Log Out');
    await wait(tracker, "!document.getElementById('workspace').hidden && !!document.querySelector('.board')");
    await openUtilities(p, size);
    await click(p, '#nextchapter-account');
    await accountReady(p); await accountReady(tracker);
    assert.equal(await evaluate(p, 'location.href'), original);
    await wait(tracker, "document.getElementById('workspace').hidden && !document.getElementById('workspace').children.length && !document.getElementById('login').hidden");
    await close(tracker); await close(p);
  }
  console.log('Passed pointer-driven About and login/return/logout in all three layouts from all four pages, persisted sessions and cross-tab protected UI clearing.');

  const unsafe = await page(`${prefix}career-radar/?returnTo=https%3A%2F%2Fattacker.invalid%2F`); await accountReady(unsafe);
  await evaluate(unsafe, "document.getElementById('login-email').value='radar@example.invalid';document.getElementById('login-password').value='fixture-only-password';document.getElementById('login-form').requestSubmit()");
  await accountReady(unsafe, 'Log Out');
  assert.equal(await evaluate(unsafe, 'location.href'), prefix + 'career-radar/');
  // Existing dirty-editor confirmation must guard the relocated logout.
  await evaluate(unsafe, "location.hash='#/prospects/new'"); await wait(unsafe, "!!document.querySelector('#workspace input[name=company]')");
  await evaluate(unsafe, "document.querySelector('#workspace input[name=company]').value='Synthetic unsaved';document.querySelector('#workspace input[name=company]').dispatchEvent(new Event('input',{bubbles:true}));window.confirm=()=>false;document.getElementById('nextchapter-account').click()");
  assert.equal(await evaluate(unsafe, "document.getElementById('nextchapter-account').textContent"), 'Log Out');
  await evaluate(unsafe, "window.confirm=()=>true;document.getElementById('nextchapter-account').click()"); await accountReady(unsafe);
  await close(unsafe);

  const first = await page(prefix + 'about.html'); const second = await page(prefix + 'career-radar.html');
  await accountReady(first); await accountReady(second); await width(first, 1512);
  await evaluate(first, "document.querySelector('.theme-toggle').click()");
  const light = await evaluate(first, "document.body.classList.contains('light')");
  await wait(second, `document.body.classList.contains('light')===${light}`);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, first.sessionId);
  assert.equal(await evaluate(first, "getComputedStyle(document.querySelector('.toggle-thumb')).transitionDuration"), '0s');
  for (const theme of ['light', 'dark']) {
    await evaluate(first, `document.body.classList.toggle('light',${theme === 'light'})`);
    for (const size of [1512, 1080, 390]) {
      await width(first, size); if (size === 390 || size === 1080) await evaluate(first, "document.querySelector('.nextchapter-menu-toggle').click()");
      const capture = await send('Page.captureScreenshot', { format: 'png' }, first.sessionId);
      await writeFile(`/private/tmp/nextchapter-navigation-${theme}-${size}.png`, Buffer.from(capture.data, 'base64'));
    }
  }
  await close(first); await close(second);
  assert.deepEqual(await (await fetch(`${origin}/__fixture`)).json(), counters, 'Navigation/authentication must not mutate prospect/history data');
  console.log('Passed safe redirect, failed-login recovery, singleton client, dirty logout guard, cross-tab theme, reduced motion and zero data writes.');
} finally {
  for (const p of pages) await send('Target.closeTarget', { targetId: p.targetId });
  socket.close();
}
