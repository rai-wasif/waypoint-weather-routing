// Local browser smoke check using installed Chrome and the native DevTools protocol.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const out = path.resolve('.qa');
await mkdir(out, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9333', `--user-data-dir=${path.join(out, 'chrome')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let tabs;
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9333/json')).json(); break; } catch { await new Promise(r => setTimeout(r, 250)); }
  }
  if (!tabs) throw new Error('Chrome did not start');
  socket = new WebSocket(tabs[0].webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', e => {
    const data = JSON.parse(e.data);
    if (data.id) { const callback = pending.get(data.id); pending.delete(data.id); callback?.(data); }
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 20000);
    pending.set(n, data => { clearTimeout(timer); data.error ? reject(new Error(JSON.stringify(data.error))) : resolve(data.result); });
    socket.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5173' });
  for (let i = 0; i < 60; i++) { if (await evaluate('Boolean(document.querySelector(".route-card"))')) break; await new Promise(r => setTimeout(r, 500)); }
  await new Promise(r => setTimeout(r, 5000));
  const results = {};
  results.routes = await evaluate('document.querySelectorAll(".route-card").length');
  if (results.routes !== 3) throw new Error('Expected three route cards');
  results.selection = await evaluate('document.querySelectorAll(".route-card")[1].click(); document.querySelectorAll(".route-card").length');
  await new Promise(r => setTimeout(r, 300));
  results.selected = await evaluate('document.querySelectorAll(".route-card")[1].getAttribute("aria-pressed")');
  if (results.selected !== 'true') throw new Error('Route selection failed');
  await evaluate('document.querySelector(".header-right button").click()');
  await new Promise(r => setTimeout(r, 200));
  results.dialog = await evaluate('Boolean(document.querySelector("[role=dialog]"))');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await new Promise(r => setTimeout(r, 200));
  results.escape = await evaluate('!document.querySelector("[role=dialog]")');
  await evaluate(`document.querySelector('[aria-label="Play forecast"]').click()`);
  await new Promise(r => setTimeout(r, 1400));
  results.playback = await evaluate('Number(document.querySelector("input[type=range]").value) > 0');
  await evaluate(`document.querySelector('[aria-label="Pause forecast"]').click()`);
  let shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path.join(out, 'desktop.png'), Buffer.from(shot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 500));
  results.mobileOverflow = await evaluate('document.documentElement.scrollWidth > innerWidth');
  shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path.join(out, 'mobile.png'), Buffer.from(shot.data, 'base64'));
  results.runtimeErrors = errors;
  if (process.argv.includes('--live')) {
    await evaluate(`Array.from(document.querySelectorAll('.segmented button')).find(b => b.textContent === '50 miles').click()`);
    await new Promise(r => setTimeout(r, 100));
    await evaluate('document.querySelector("form").requestSubmit()');
    for (let i = 0; i < 90; i++) {
      await new Promise(r => setTimeout(r, 2000));
      if (await evaluate('!document.querySelector("button[type=submit]").disabled')) break;
    }
    results.live = await evaluate('document.querySelector(".mode-badge").textContent.trim()');
    results.liveError = await evaluate('document.querySelector(".error")?.textContent || null');
    if (results.live !== 'Live forecast') throw new Error(`Live trip failed: ${results.liveError}`);
  }
  await writeFile(path.join(out, 'browser-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (!results.dialog || !results.escape || !results.playback || results.mobileOverflow || errors.length) throw new Error('Browser check failed');
} finally { socket?.close(); chrome.kill(); }
