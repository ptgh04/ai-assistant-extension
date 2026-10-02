// Runs the built extension in an isolated Chrome for Testing profile.
// All three provider APIs are intercepted with synthetic responses, never real keys.
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PROVIDERS } from '../src/ai-backend/ai/types';

const root = process.cwd();
const chromePath = process.env.CHROME_PATH || resolve(root, 'node_modules/.chrome-for-testing/chrome-win64/chrome.exe');
const profile = resolve(root, `temp/chrome-phase6-${Date.now()}`);
await mkdir(profile, { recursive: true });
const browser = Bun.spawn([chromePath, '--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-port=0',
  `--disable-extensions-except=${resolve(root, '.output/chrome-mv3')}`, `--load-extension=${resolve(root, '.output/chrome-mv3')}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdout: 'ignore', stderr: Bun.file(resolve(profile, 'chrome.log')) });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let port = 0;
  for (let n = 0; n < 300 && !port; n++) {
    const portFile = Bun.file(resolve(profile, 'DevToolsActivePort'));
    if (await portFile.exists()) port = Number((await portFile.text()).split('\n')[0]);
    if (!port) await delay(100);
  }
  assert(port > 0, 'Chrome must publish its debugging port');
  const targets = () => fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
  const extensionName = (target) => new Promise((resolve, reject) => {
    const probe = new WebSocket(target.webSocketDebuggerUrl);
    const timeout = setTimeout(() => { probe.close(); reject(new Error('Manifest probe timed out')); }, 5000);
    probe.onopen = () => probe.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'chrome.runtime.getManifest().name', returnByValue: true } }));
    probe.onmessage = ({ data }) => {
      const reply = JSON.parse(data);
      if (reply.id === 1) { clearTimeout(timeout); probe.close(); resolve(reply.result?.result?.value); }
    };
    probe.onerror = (error) => { clearTimeout(timeout); reject(error); };
  });
  let worker;
  for (let n = 0; n < 100 && !worker; n++) {
    for (const candidate of (await targets()).filter((t) => t.type === 'service_worker' && t.url.startsWith('chrome-extension://'))) {
      if (await extensionName(candidate) === 'AI Helper') { worker = candidate; break; }
    }
    if (!worker) await delay(100);
  }
  assert(worker, 'Extension service worker must load');
  const extensionBase = new URL(worker.url).origin;
  // URL.origin is null for extension URLs in some runtimes.
  const base = extensionBase === 'null' ? worker.url.slice(0, worker.url.lastIndexOf('/')) : extensionBase;
  const target = (await targets()).find((t) => t.type === 'page');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const failures = [];
  const providerRequests = [];
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id); pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      providerRequests.push(request);
      const isChat = request.method === 'POST';
      const frame = (event) => 'data: ' + JSON.stringify(event) + '\n\n';
      const body = !isChat ? '{}' : request.url.includes('api.anthropic.com')
        ? frame({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Browser smoke response' } }) +
          frame({ type: 'message_delta', delta: { stop_reason: 'end_turn' } }) + frame({ type: 'message_stop' })
        : request.url.includes('generativelanguage.googleapis.com')
          ? frame({ candidates: [{ content: { parts: [{ text: 'Browser smoke response' }] }, finishReason: 'STOP' }] })
          : frame({ type: 'response.output_text.delta', delta: 'Browser smoke response' }) + frame({ type: 'response.completed' });
      const fulfill = () => call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: !isChat ? 'application/json' : 'text/event-stream' }], body: Buffer.from(body).toString('base64') });
      void (isChat ? delay(350).then(fulfill) : fulfill()).catch((e) => failures.push(e.message));
    }
  };
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let n = 0; n < 100; n++) { if (await evaluate(expression)) return; await delay(50); }
    throw new Error(`UI condition timed out: ${expression}; state=${await evaluate('JSON.stringify({url:location.href, text:document.body.innerText.slice(0,1200)})')}; exceptions=${JSON.stringify(failures)}`);
  };
  const click = async (label) => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === ${JSON.stringify(label)}); if (!b || b.disabled) throw Error('Button missing or disabled'); b.click(); })()`);
  const fill = async (selector, value) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const p = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const chooseProvider = async (id) => evaluate(`(() => { const e = document.querySelector('#settings-provider, #setup-provider'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(e, ${JSON.stringify(id)}); e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const select = async (selector, value) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.value = ${JSON.stringify(value)}; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const initialModels = Object.fromEntries(PROVIDERS.map(({ id, models }) => [id, models[1].id]));
  const savedModels = { ...initialModels };
  const checkModels = async (selector, models) => {
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${selector} option')].map(o => o.value)`), models.map(model => model.id));
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Network.enable');
  await call('Fetch.enable', { patterns: ['https://api.openai.com/*', 'https://api.anthropic.com/*', 'https://generativelanguage.googleapis.com/*'].map((urlPattern) => ({ urlPattern })) });
  await call('Emulation.setDeviceMetricsOverride', { width: 360, height: 760, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: `${base}/sidepanel.html` });
  await waitFor(`document.body.innerText.includes('Set up AI Helper')`);
  assert.equal(await evaluate(`!!document.querySelector('#chat-input')`), false);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('#response-language option')].map(o => o.value)`), ['en', 'vi']);
  await select('#response-language', 'vi');
  assert.equal(await evaluate(`document.querySelector('#interface-language').value`), 'en');
  await fill('input', 'synthetic browser passphrase');
  await click('Continue');
  await waitFor(`document.body.innerText.includes('Choose provider')`);
  for (const { id, models } of PROVIDERS) {
    await chooseProvider(id);
    await checkModels('#setup-model', models);
    assert.equal(await evaluate(`document.querySelector('#setup-model').value`), models[0].id);
  }
  await chooseProvider('anthropic');
  await select('#setup-model', initialModels.anthropic);
  await click('Continue');
  await waitFor(`document.body.innerText.includes('Enter your API key')`);
  await fill('input', 'synthetic-browser-credential-never-a-real-key');
  await click('Continue');
  await click('Validate & Save');
  await waitFor(`!!document.querySelector('#chat-input')`);
  const stored = await evaluate(`chrome.storage.local.get(null).then(JSON.stringify)`);
  assert(!stored.includes('synthetic-browser-credential'));
  assert(!stored.includes('synthetic browser passphrase'));
  await fill('#chat-input', 'Smoke question');
  await click('Send');
  await waitFor(`document.body.innerText.includes('Response saved.')`);
  assert((await evaluate(`document.body.innerText`)).includes('Browser smoke response'));
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  const screenshot = await call('Page.captureScreenshot', { format: 'png' });
  await Bun.write(resolve(root, 'temp/phase6-chat.png'), Buffer.from(screenshot.data, 'base64'));
  await call('Page.reload');
  await waitFor(`document.body.innerText.includes('Unlock AI Helper')`);
  await fill('input[type=password]', 'synthetic browser passphrase');
  await click('Unlock vault');
  await waitFor(`document.body.innerText.includes('Browser smoke response')`);
  // Add both remaining provider keys through the actual Settings UI.
  for (const id of ['openai', 'gemini']) {
    await evaluate(`document.querySelector('[aria-label="Open settings"]').click()`);
    await chooseProvider(id);
    await checkModels('#settings-model', PROVIDERS.find(provider => provider.id === id).models);
    await select('#settings-model', initialModels[id]);
    await waitFor(`document.querySelectorAll('[role=dialog] input[type=password]').length === 2`);
    await fill('#settings-api-key', 'synthetic-browser-' + id + '-credential-never-real');
    await fill('#settings-vault-passphrase', 'synthetic browser passphrase');
    await click('Validate & Save');
    await waitFor(`document.body.innerText.includes('API key validated, encrypted, and saved locally.')`);
    await evaluate(`document.querySelector('[role=dialog] button[aria-label="Close settings"]').click()`);
    await fill('#chat-input', id + ' smoke question');
    await click('Send');
    await waitFor(`document.body.innerText.includes('Response saved.')`);
  }
  const multiVault = await evaluate(`chrome.storage.local.get('aiHelperVault').then(v => v.aiHelperVault)`);
  assert.equal(multiVault.version, 2);
  assert.deepEqual(Object.keys(multiVault.models).sort(), ['anthropic', 'gemini', 'openai']);
  assert(!JSON.stringify(multiVault).includes('synthetic-browser-'));
  assert.equal(multiVault.provider, 'gemini');
  assert.deepEqual(multiVault.models, savedModels);
  await evaluate(`document.querySelector('[aria-label="Open settings"]').click()`);
  await click('Replace API key');
  await fill('#settings-api-key', 'synthetic-browser-gemini-replacement-never-real');
  await fill('#settings-vault-passphrase', 'synthetic browser passphrase');
  await click('Validate & Save');
  await waitFor(`document.body.innerText.includes('API key validated, encrypted, and saved locally.')`);
  await chooseProvider('openai');
  savedModels.openai = PROVIDERS[0].models.at(-1).id;
  await select('#settings-model', savedModels.openai);
  await click('Save Provider & Model');
  await waitFor(`document.body.innerText.includes('Provider and model saved.')`);
  await evaluate(`document.querySelector('[role=dialog] button[aria-label="Close settings"]').click()`);
  await call('Page.reload');
  await waitFor(`document.body.innerText.includes('Unlock AI Helper')`);
  await fill('input[type=password]', 'synthetic browser passphrase');
  await click('Unlock vault');
  await waitFor(`!!document.querySelector('#chat-input') && document.body.innerText.includes('OpenAI')`);
  await evaluate(`document.querySelector('[aria-label="Open settings"]').click()`);
  for (const { id, models } of PROVIDERS) {
    await chooseProvider(id);
    await checkModels('#settings-model', models);
    assert.equal(await evaluate(`document.querySelector('#settings-model').value`), savedModels[id]);
  }
  await chooseProvider('openai');
  await evaluate(`document.querySelector('[role=dialog] button[aria-label="Close settings"]').click()`);
  for (const host of ['api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com']) {
    assert(providerRequests.some((request) => new URL(request.url).hostname === host && request.method === 'POST'));
  }
  const expectedKeys = {
    'api.openai.com': ['authorization', 'Bearer synthetic-browser-openai-credential-never-real'],
    'api.anthropic.com': ['x-api-key', 'synthetic-browser-credential-never-a-real-key'],
    'generativelanguage.googleapis.com': ['x-goog-api-key', 'synthetic-browser-gemini-credential-never-real'],
  };
  for (const request of providerRequests.filter((request) => request.method === 'POST')) {
    const [header, expected] = expectedKeys[new URL(request.url).hostname];
    const actual = Object.entries(request.headers).find(([name]) => name.toLowerCase() === header)?.[1];
    assert.equal(actual, expected);
    assert(!request.url.includes('synthetic-browser-'));
    const body = JSON.parse(request.postData);
    const system = body.system ?? body.systemInstruction?.parts[0].text ?? body.input[0].content;
    assert(system.includes('Respond in Vietnamese.'));
    if (request.url.includes('generativelanguage.googleapis.com')) {
      assert(new URL(request.url).pathname.endsWith('/models/' + initialModels.gemini + ':streamGenerateContent'));
    } else {
      const provider = request.url.includes('api.openai.com') ? 'openai' : 'anthropic';
      assert.equal(JSON.parse(request.postData).model, initialModels[provider]);
    }
  }
  await evaluate(`document.querySelector('[aria-label="Open conversation history"]').click()`);
  await click('+ New Chat');
  await waitFor(`document.body.innerText.includes('Start a conversation')`);
  await fill('#chat-input', 'Delete UI question');
  await click('Send');
  await waitFor(`document.body.innerText.includes('Response saved.')`);
  await evaluate(`document.querySelector('[aria-label="Open conversation history"]').click()`);
  await click('Rename');
  await fill('#conversation-title', 'Renamed browser chat');
  await evaluate(`document.querySelector('[role=dialog] button[type=submit]').click()`);
  await waitFor(`document.body.innerText.includes('Renamed browser chat')`);
  await fill('#history-search', 'nothing matches this query');
  await waitFor(`document.body.innerText.includes('No conversations found')`);
  await fill('#history-search', 'Delete UI question');
  await waitFor(`document.querySelectorAll('.history-drawer article').length === 1`);
  assert((await evaluate(`document.querySelector('.history-drawer').innerText`)).includes('Renamed browser chat'));
  await fill('#history-search', '');
  const deletedId = await evaluate(`chrome.storage.local.get('aiHelperActiveConversationId').then(s => s.aiHelperActiveConversationId)`);
  await click('Delete');
  await evaluate(`document.querySelector('[role=alertdialog] button:last-child').click()`);
  await waitFor(`!document.querySelector('[role=alertdialog]')`);
  await evaluate(`document.querySelector('button[aria-label="Close conversation history"]').click()`);
  await waitFor(`document.body.innerText.includes('Start a conversation')`);
  assert.equal(await evaluate(`document.querySelector('main[aria-label="Conversation"]').innerText.includes('Browser smoke response')`), false);
  assert.equal(await evaluate(`chrome.storage.local.get('aiHelperMessages').then(s => s.aiHelperMessages.some(m => m.conversationId === ${JSON.stringify(deletedId)}))`), false);
  await evaluate(`document.querySelector('button[aria-label="Open settings"]').click()`);
  const callsBeforeSelection = providerRequests.length;
  await evaluate(`chrome.storage.local.set({ aiHelperPendingPageContent: { source:'selection', strategy:'smart-extraction', title:'Selected fixture', url:'https://example.com', text:'Source to analyze', characterCount:17, estimatedTokens:5, maxCharacters:12000, maxTokens:3000, truncated:false, capturedAt:Date.now() } })`);
  await waitFor(`document.body.innerText.includes('Selected fixture')`);
  assert.equal(await evaluate(`!!document.querySelector('.settings-drawer')`), false);
  assert.equal(await evaluate(`document.querySelector('[data-testid="ai-actions"] h2').textContent`), 'Choose an action');
  assert.equal(providerRequests.length, callsBeforeSelection);
  for (const [tool, title] of [['summarize', 'Summarizing…'], ['explain', 'Explaining…'], ['translate', 'Translating…'], ['rewrite', 'Rewriting…']]) {
    await evaluate(`document.querySelector('[data-action="${tool}"]').click()`);
    await waitFor(`document.querySelector('[data-testid="ai-activity"]')?.textContent.includes(${JSON.stringify(title)})`);
    await waitFor(`document.body.innerText.includes('Response saved.') && !document.querySelector('#chat-input').disabled`);
  }
  assert.equal(await evaluate(`document.querySelector('#translation-language').value`), 'Auto');
  assert.equal(await evaluate(`document.querySelector('header h1').textContent.includes('Summarize')`), true);
  const autoRequest = providerRequests.filter(r => r.method === 'POST').at(-2);
  assert(autoRequest.postData.includes('If it is Vietnamese, translate it into English'));
  assert(!JSON.parse(autoRequest.postData).input[0].content.includes('Respond in '));
  for (const language of ['English', 'Vietnamese']) {
    await select('#translation-language', language);
    await evaluate(`document.querySelector('[data-action="translate"]').click()`);
    await waitFor(`document.body.innerText.includes('Response saved.') && !document.querySelector('#chat-input').disabled`);
    assert(providerRequests.at(-1).postData.includes('into ' + language));
    assert(!JSON.parse(providerRequests.at(-1).postData).input[0].content.includes('Respond in '));
  }
  await fill('#chat-input', 'Draft survives offline');
  await call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await waitFor(`document.body.innerText.includes('You are offline')`);
  assert.equal(await evaluate(`document.querySelector('#chat-input').value`), 'Draft survives offline');
  assert.equal(await evaluate(`document.querySelector('#chat-input').closest('form').querySelector('button').disabled`), true);
  await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await waitFor(`document.body.innerText.includes('Connection restored')`);
  assert.equal(await evaluate(`document.querySelector('#chat-input').value`), 'Draft survives offline');
  await evaluate(`document.querySelector('button[aria-label="Open settings"]').click()`);
  await select('#appearance-theme', 'dark');
  await select('#interface-language', 'vi');
  assert.equal(await evaluate(`document.querySelector('#response-language').value`), 'vi');
  await select('#response-language', 'en');
  await waitFor(`chrome.storage.local.get('aiHelperPreferences').then(s => s.aiHelperPreferences.responseLanguage === 'en')`);
  await waitFor(`document.documentElement.classList.contains('dark') && document.querySelector('#settings-title').textContent === 'Cài đặt'`);
  assert.equal(await evaluate(`document.documentElement.lang`), 'vi');
  assert((await evaluate(`document.querySelector('.preferences-card').innerText`)).includes('Ngôn ngữ trả lời'));
  await delay(350);
  const darkImage = await call('Page.captureScreenshot', { format: 'png' });
  await Bun.write(resolve(root, 'temp/ui-settings-dark.png'), Buffer.from(darkImage.data, 'base64'));
  await call('Page.reload');
  await waitFor(`document.body.innerText.includes('Mở khóa AI Helper')`);
  assert.equal(await evaluate(`document.documentElement.classList.contains('dark')`), true);
  assert.equal(await evaluate(`document.querySelector('#response-language').value`), 'en');
  await fill('input[type=password]', 'synthetic browser passphrase');
  await click('Mở khóa Vault');
  await waitFor(`!!document.querySelector('#chat-input')`);
  await fill('#chat-input', 'Reply language after reload');
  await click('Gửi');
  await waitFor(`!document.querySelector('#chat-input').disabled && document.body.innerText.includes('Đã lưu câu trả lời.')`);
  assert(JSON.parse(providerRequests.at(-1).postData).input[0].content.includes('Respond in English.'));
  await evaluate(`document.querySelector('button[aria-label="Mở cài đặt"]').click()`);
  await select('#appearance-theme', 'system');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await waitFor(`!document.documentElement.classList.contains('dark')`);
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await waitFor(`document.documentElement.classList.contains('dark')`);
  await select('#appearance-theme', 'light');
  await waitFor(`!document.documentElement.classList.contains('dark')`);
  await select('#interface-language', 'en');
  await evaluate(`document.querySelector('[role=dialog] button[aria-label="Close settings"]').click()`);
  await delay(350);
  const lightImage = await call('Page.captureScreenshot', { format: 'png' });
  await Bun.write(resolve(root, 'temp/ui-chat-light.png'), Buffer.from(lightImage.data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 320, height: 500, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
  assert.equal(await evaluate(`document.querySelector('#chat-input').getBoundingClientRect().bottom <= innerHeight`), true);
  await evaluate(`document.querySelector('button[aria-label="Open settings"]').click()`);
  await click('Reset vault / replace API key');
  await fill('[aria-label="Reset confirmation"]', 'RESET');
  await click('Reset vault');
  await waitFor(`document.body.innerText.includes('Set up AI Helper')`);
  const afterReset = await evaluate(`chrome.storage.local.get(null)`);
  assert(!afterReset.aiHelperVault);
  assert(afterReset.aiHelperMessages.length > 0);
  assert.equal(afterReset.aiHelperPreferences.responseLanguage, 'en');
  assert.deepEqual(failures, []);
  console.log('Browser smoke PASS: MV3 load, three-provider setup/chat, model dropdowns and non-default model persistence/routing, encrypted vault, history search/rename/delete clearing chat, selection handoff revealing actions, action headings, Auto/English/Vietnamese translation, offline/reconnect preserving draft, light/dark/system themes, independent English/Vietnamese interface and response languages, saved preferences on reload, vault reset and 320/360px layout; all APIs mocked.');
  console.log('Screenshots: temp/phase6-chat.png, temp/ui-settings-dark.png, temp/ui-chat-light.png');
} finally {
  socket?.close();
  browser.kill();
  await browser.exited;
}
