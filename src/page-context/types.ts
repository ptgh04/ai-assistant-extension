export const PAGE_CONTEXT_REQUEST = 'ai-helper:extract-page-context';
export const PENDING_PAGE_CONTENT_KEY = 'aiHelperPendingPageContent';

export const PAGE_CONTENT_LIMITS = {
  maxCharacters: 12_000,
  maxTokens: 3_000,
} as const;

export type PageContentSource = 'page' | 'selection';
export type ContextStrategy = 'smart-extraction';

export interface PageContent {
  source: PageContentSource;
  strategy: ContextStrategy;
  title: string;
  url: string;
  text: string;
  characterCount: number;
  estimatedTokens: number;
  maxCharacters: number;
  maxTokens: number;
  truncated: boolean;
  capturedAt: number;
}

export interface PageContextRequest {
  type: typeof PAGE_CONTEXT_REQUEST;
  tabId: number;
}

export type PageContextResponse =
  | { ok: true; content: PageContent }
  | { ok: false; error: string };

