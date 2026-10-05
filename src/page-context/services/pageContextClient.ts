import {
  PAGE_CONTEXT_REQUEST,
  PENDING_PAGE_CONTENT_KEY,
  type PageContent,
  type PageContextRequest,
  type PageContextResponse,
} from '../types';

export class PageContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PageContextError';
  }
}

export async function extractActivePageContent(): Promise<PageContent> {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (typeof tab?.id !== 'number') {
    throw new PageContextError('No active browser tab is available.');
  }

  const request: PageContextRequest = {
    type: PAGE_CONTEXT_REQUEST,
    tabId: tab.id,
  };
  const response = (await chrome.runtime.sendMessage(
    request,
  )) as PageContextResponse;
  if (!response?.ok) {
    throw new PageContextError(
      response?.error ?? 'The page could not be read.',
    );
  }
  return response.content;
}

export async function consumePendingPageContent(): Promise<PageContent | null> {
  const stored = await chrome.storage.local.get(PENDING_PAGE_CONTENT_KEY);
  const content = stored[PENDING_PAGE_CONTENT_KEY] as PageContent | undefined;
  if (!content) {
    return null;
  }
  await acknowledgePendingPageContent(content.capturedAt);
  return content;
}

async function acknowledgePendingPageContent(
  capturedAt: number,
): Promise<void> {
  const stored = await chrome.storage.local.get(PENDING_PAGE_CONTENT_KEY);
  const current = stored[PENDING_PAGE_CONTENT_KEY] as PageContent | undefined;
  if (current?.capturedAt === capturedAt) {
    await chrome.storage.local.remove(PENDING_PAGE_CONTENT_KEY);
  }
}

export function subscribeToPendingPageContent(
  listener: (content: PageContent) => void,
): () => void {
  const handleChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local') {
      return;
    }
    const content = changes[PENDING_PAGE_CONTENT_KEY]?.newValue as
      | PageContent
      | undefined;
    if (!content) {
      return;
    }
    listener(content);
    void acknowledgePendingPageContent(content.capturedAt);
  };

  chrome.storage.onChanged.addListener(handleChange);
  return () => chrome.storage.onChanged.removeListener(handleChange);
}

