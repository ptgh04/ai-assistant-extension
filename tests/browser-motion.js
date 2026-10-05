import assert from 'node:assert/strict';

// Called by browser-smoke after setup, with OpenAI selected and all APIs mocked.
export async function verifyMotion({ call, evaluate, waitFor, click, fill }) {
  const motionPreference = (value) => call('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value }],
  });
  const animationName = (selector, pseudo = null) => evaluate(
    `getComputedStyle(document.querySelector(${JSON.stringify(selector)}), ${JSON.stringify(pseudo)}).animationName`,
  );
  await motionPreference('no-preference');
  await evaluate(`document.querySelector('[aria-label="Open settings"]').click()`);
  await waitFor(`!!document.querySelector('.settings-drawer')`);
  assert.equal(await animationName('.settings-drawer'), 'drawer-right');
  assert.equal(await animationName('.overlay-enter'), 'fade-in');
  await evaluate(`document.querySelector('.settings-drawer [aria-label="Close settings"]').click()`);
  await evaluate(`document.querySelector('[aria-label="Open conversation history"]').click()`);
  await waitFor(`!!document.querySelector('.history-drawer')`);
  assert.equal(await animationName('.history-drawer'), 'drawer-left');
  await click('Rename');
  await waitFor(`!!document.querySelector('.dialog-enter')`);
  assert.equal(await animationName('.dialog-enter'), 'dialog-in');
  await click('Cancel');
  await evaluate(`document.querySelector('.history-drawer [aria-label="Close conversation history"]').click()`);

  // Keep each SSE chunk under test control: no external calls or timing races.
  await evaluate(`(() => {
    const originalFetch = window.fetch;
    window.__restoreMotionFetch = () => { window.fetch = originalFetch; };
    window.fetch = (url, options) => {
      if (String(url).startsWith('https://api.openai.com/') && options?.body?.includes('Motion stream fixture')) {
        return Promise.resolve(new Response(new ReadableStream({
          start(controller) { window.__motionController = controller; }
        }), { headers: { 'Content-Type': 'text/event-stream' } }));
      }
      return originalFetch(url, options);
    };
  })()`);
  const emit = (event) => evaluate(`window.__motionController.enqueue(new TextEncoder().encode(${JSON.stringify('data: ' + JSON.stringify(event) + '\n\n')}))`);
  try {
    await fill('#chat-input', 'Motion stream fixture');
    await click('Send');
    await waitFor(`!!window.__motionController`);
    await emit({ type: 'response.output_text.delta', delta: 'Motion fixture first chunk' });
    await waitFor(`!!document.querySelector('.streaming-cursor')`);
    assert.equal(await animationName('.streaming-cursor'), 'cursor-pulse');
    assert.equal(await animationName('.activity-orbit'), 'breathe');
    assert.equal(await animationName('.activity-orbit', '::before'), 'orbit-turn');
    assert.equal(await animationName('.activity-card', '::after'), 'shimmer');
    await evaluate(`(() => {
      window.__motionBubble = document.querySelector('.streaming-cursor').closest('article');
      window.__motionEntry = window.__motionBubble.getAnimations().find(a => a.animationName === 'message-in');
      if (!window.__motionEntry) throw Error('Message entry animation was not created');
      window.__motionEntry.finish();
    })()`);
    await emit({ type: 'response.output_text.delta', delta: ' and second chunk' });
    await waitFor(`document.querySelector('.streaming-cursor')?.parentElement.textContent.includes('second chunk')`);
    assert.equal(await evaluate(`document.querySelector('.streaming-cursor').closest('article') === window.__motionBubble`), true);
    assert.equal(await evaluate(`window.__motionEntry.playState`), 'finished');
    assert.equal(await evaluate(`window.__motionBubble.getAnimations().some(a => a.animationName === 'message-in' && a.playState === 'running')`), false);

    // Changing the OS preference while streaming stops loops immediately.
    await motionPreference('reduce');
    for (const [selector, pseudo] of [
      ['.streaming-cursor', null], ['.activity-orbit', null],
      ['.activity-orbit', '::before'], ['.activity-card', '::after'],
      ['.activity-dots i', null], ['.message-enter', null],
    ]) {
      assert.equal(await animationName(selector, pseudo), 'none');
    }
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.send-button')).transitionDuration`), '0s');
    await emit({ type: 'response.completed' });
    await evaluate(`window.__motionController.close()`);
    await waitFor(`!document.querySelector('#chat-input').disabled && !!document.querySelector('.success-notice')`);
    assert.equal(await evaluate(`!!document.querySelector('.streaming-cursor')`), false);
    assert.equal(await animationName('.success-check'), 'none');
    await evaluate(`document.querySelector('[aria-label="Open settings"]').click()`);
    await waitFor(`!!document.querySelector('.settings-drawer')`);
    assert.equal(await animationName('.settings-drawer'), 'none');
    assert.equal(await animationName('.overlay-enter'), 'none');
    await evaluate(`document.querySelector('.settings-drawer [aria-label="Close settings"]').click()`);
  } finally {
    await evaluate(`(() => {
      window.__restoreMotionFetch();
      delete window.__restoreMotionFetch;
      delete window.__motionController;
      delete window.__motionBubble;
      delete window.__motionEntry;
    })()`);
    await motionPreference('no-preference');
  }
  console.log('Motion PASS: panel/dialog entrances, progressive SSE cursor, stable message animation across chunks, completed-state cleanup, reduced-motion loops/transitions/panels.');
}
