import { beforeEach, expect, test } from 'bun:test';
globalThis.defineBackground = (callback) => callback;
const { default: start } = await import('../entrypoints/background');
let clickHandler;
let messageHandler;
let installHandler;
let opened;
let saved;
let result;
let url;
let created;
beforeEach(() => {
  opened = [];
  saved = {};
  created = [];
  result = { text: 'Readable page' };
  url = 'https://example.com';
  globalThis.chrome = {
    sidePanel: { async setPanelBehavior() {}, open(options) { opened.push(options); return Promise.resolve(); } },
    contextMenus: {
      removeAll(callback) { callback(); }, create(options) { created.push(options); },
      onClicked: { addListener(callback) { clickHandler = callback; } },
    },
    runtime: {
      onInstalled: { addListener(callback) { installHandler = callback; } },
      onMessage: { addListener(callback) { messageHandler = callback; } },
    },
    tabs: { async get() { return { url }; } },
    scripting: { async executeScript(options) {
      expect(options.target).toEqual({ tabId: 42 });
      expect(options.args[0].maxCharacters).toBe(12000);
      return [{ result }];
    } },
    storage: { local: { async set(value) { Object.assign(saved, value); } } },
  };
  start();
});

test('selection menu registers and opens panel synchronously in click handler', async () => {
  installHandler();
  expect(created[0].contexts).toEqual(['selection']);
  expect(created[0].title).toBe('AI Helper');
  clickHandler({ menuItemId: created[0].id, selectionText: 'Selected paragraph', pageUrl: url }, { id: 42, title: 'Title' });
  expect(opened).toEqual([{ tabId: 42 }]);
  expect(saved.aiHelperPendingPageContent.text).toBe('Selected paragraph');
});

test('background returns readable extraction, empty and restricted page errors', async () => {
  const request = () => new Promise((resolve) => {
    expect(messageHandler({ type: 'ai-helper:extract-page-context', tabId: 42 }, {}, resolve)).toBe(true);
  });
  expect(await request()).toEqual({ ok: true, content: result });
  result = { text: '' };
  expect(await request()).toMatchObject({ ok: false, error: 'No readable text was found on this page.' });
  url = 'chrome://extensions';
  expect((await request()).error).toContain('protected');
});
