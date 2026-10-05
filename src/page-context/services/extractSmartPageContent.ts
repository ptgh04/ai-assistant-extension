import type { PageContent } from '../types';

interface ExtractionLimits {
  maxCharacters: number;
  maxTokens: number;
}

export function extractSmartPageContent(
  limits: ExtractionLimits,
): PageContent {
  const ignoredTags = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'IFRAME',
    'SVG',
    'CANVAS',
    'NAV',
    'HEADER',
    'FOOTER',
    'ASIDE',
    'FORM',
    'BUTTON',
    'INPUT',
    'SELECT',
    'TEXTAREA',
  ]);
  const blockSelector = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'li',
    'blockquote',
    'pre',
    'td',
    'th',
    'figcaption',
  ].join(',');
  const ignoredSelector =
    'script, style, noscript, iframe, svg, canvas, nav, header, footer, aside, form, button, input, select, textarea';
  const normalize = (value: string) =>
    value.replaceAll(/\u00a0/g, ' ').replaceAll(/[ \t]+/g, ' ').trim();
  const isVisible = (element: Element) => {
    if (
      ignoredTags.has(element.tagName) ||
      element.hasAttribute('hidden') ||
      element.getAttribute('aria-hidden') === 'true'
    ) {
      return false;
    }
    let current: Element | null = element;
    while (current) {
      const style = window.getComputedStyle(current);
      if (
        current.hasAttribute('hidden') ||
        current.getAttribute('aria-hidden') === 'true' ||
        ignoredTags.has(current.tagName) ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  };
  const visibleText = (element: Element) => {
    const parts: string[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && !parent.closest(ignoredSelector) && isVisible(parent)) {
        const value = normalize(node.textContent ?? '');
        if (value) parts.push(value);
      }
      node = walker.nextNode();
    }
    return parts.join(' ');
  };
  const score = (element: Element) => {
    const textLength = normalize(element.textContent ?? '').length;
    const linkLength = Array.from(element.querySelectorAll('a')).reduce(
      (total, link) => total + normalize(link.textContent ?? '').length,
      0,
    );
    return textLength - linkLength * 0.75;
  };

  const candidates = Array.from(
    document.querySelectorAll(
      'article, main, [role="main"], [class*="article"], [class*="post"], [class*="content"]',
    ),
  ).filter(isVisible);
  const root =
    candidates.sort((left, right) => score(right) - score(left))[0] ??
    document.body;
  const seen = new Set<string>();
  const blocks: string[] = [];

  for (const element of root.querySelectorAll(blockSelector)) {
    if (
      !isVisible(element) ||
      element.closest('nav, header, footer, form, aside')
    ) {
      continue;
    }
    // Parent blocks (e.g. li > p) must not duplicate their descendants.
    if (element.querySelector(blockSelector)) continue;
    const text = visibleText(element);
    if (text.length < 2 || seen.has(text)) {
      continue;
    }
    seen.add(text);
    blocks.push(text);
  }

  let text = blocks.join('\n');
  if (!text) {
    const fallbackBlocks: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (
        parent &&
        isVisible(parent) &&
        !parent.closest(ignoredSelector)
      ) {
        const value = normalize(node.textContent ?? '');
        if (value) {
          fallbackBlocks.push(value);
        }
      }
      node = walker.nextNode();
    }
    text = fallbackBlocks.join('\n');
  }

  const characterCeiling = Math.min(
    limits.maxCharacters,
    limits.maxTokens * 4,
  );
  const truncated = text.length > characterCeiling;
  if (truncated) {
    const slice = text.slice(0, characterCeiling);
    const lastBoundary = Math.max(
      slice.lastIndexOf('\n'),
      slice.lastIndexOf(' '),
    );
    text = slice
      .slice(
        0,
        lastBoundary > characterCeiling * 0.8 ? lastBoundary : undefined,
      )
      .trim();
  }

  return {
    source: 'page',
    strategy: 'smart-extraction',
    title: normalize(document.title) || 'Untitled page',
    url: window.location.href,
    text,
    characterCount: text.length,
    estimatedTokens: Math.ceil(text.length / 4),
    maxCharacters: limits.maxCharacters,
    maxTokens: limits.maxTokens,
    truncated,
    capturedAt: Date.now(),
  };
}
