import { afterEach, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { extractSmartPageContent } from '../src/page-context/services/extractSmartPageContent';
import { PAGE_CONTENT_LIMITS } from '../src/page-context/types';
const previous = { document: globalThis.document, window: globalThis.window, NodeFilter: globalThis.NodeFilter };
afterEach(() => Object.assign(globalThis, previous));

function extract(body) {
  const { document } = parseHTML(`<html><head><title>Fixture</title></head><body>${body}</body></html>`);
  Object.assign(globalThis, {
    document, NodeFilter: { SHOW_TEXT: 4 },
    window: {
      location: { href: 'https://example.com/fixture' },
      getComputedStyle(element) {
        return { display: element.style.display || 'block', visibility: element.style.visibility || 'visible', opacity: element.style.opacity || '1' };
      },
    },
  });
  return extractSmartPageContent(PAGE_CONTENT_LIMITS);
}

test('smart extraction removes hidden descendants, ancestors, and executable content', () => {
  const content = extract('<nav>skip navigation</nav><main><h1>Visible heading</h1><p>Visible text<span hidden>HIDDEN</span><script>SCRIPT</script><style>STYLE</style><iframe>IFRAME</iframe></p><div aria-hidden="true"><p>ARIA</p></div><div style="display:none"><p>DISPLAY</p></div><p><span style="visibility:hidden">VISIBILITY</span>Readable</p></main>');
  expect(content.text).toContain('Visible text');
  expect(content.text).toContain('Readable');
  for (const secret of ['HIDDEN', 'SCRIPT', 'STYLE', 'IFRAME', 'ARIA', 'DISPLAY', 'VISIBILITY', 'navigation']) expect(content.text).not.toContain(secret);
});

test('div-only fallback is sanitized and empty page stays empty', () => {
  expect(extract('<div>Visible<div hidden>secret</div><script>script leak</script></div>').text).toBe('Visible');
  expect(extract('<script>Nothing readable</script>').text).toBe('');
});

test('very long page is capped and flagged as truncated', () => {
  const content = extract(`<article><p>${'Article text '.repeat(10_000)}</p></article>`);
  expect(content.truncated).toBe(true);
  expect(content.characterCount).toBeLessThanOrEqual(PAGE_CONTENT_LIMITS.maxCharacters);
  expect(content.estimatedTokens).toBeLessThanOrEqual(PAGE_CONTENT_LIMITS.maxTokens);
});
