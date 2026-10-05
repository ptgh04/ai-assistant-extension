import {
  PAGE_CONTENT_LIMITS,
  type PageContent,
} from '../types';

interface SelectionSource {
  text: string;
  title?: string;
  url?: string;
}

export function createSelectionPageContent(
  source: SelectionSource,
): PageContent | null {
  const normalized = source.text
    .replaceAll(/\u00a0/g, ' ')
    .replaceAll(/[ \t]+/g, ' ')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) {
    return null;
  }

  const characterCeiling = Math.min(
    PAGE_CONTENT_LIMITS.maxCharacters,
    PAGE_CONTENT_LIMITS.maxTokens * 4,
  );
  const truncated = normalized.length > characterCeiling;
  const text = normalized.slice(0, characterCeiling).trim();

  return {
    source: 'selection',
    strategy: 'smart-extraction',
    title: source.title?.trim() || 'Selected text',
    url: source.url ?? '',
    text,
    characterCount: text.length,
    estimatedTokens: Math.ceil(text.length / 4),
    maxCharacters: PAGE_CONTENT_LIMITS.maxCharacters,
    maxTokens: PAGE_CONTENT_LIMITS.maxTokens,
    truncated,
    capturedAt: Date.now(),
  };
}

