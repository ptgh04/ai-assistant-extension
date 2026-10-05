import {
  createSelectionPageContent,
  extractSmartPageContent,
  PAGE_CONTENT_LIMITS,
  PAGE_CONTEXT_REQUEST,
  PENDING_PAGE_CONTENT_KEY,
  type PageContextRequest,
  type PageContextResponse,
} from '@/page-context';

const ASK_AI_CONTEXT_MENU_ID = 'ai-helper-ask-selection';

function isPageContextRequest(message: unknown): message is PageContextRequest {
  if (!message || typeof message !== 'object') {
    return false;
  }
  const candidate = message as Partial<PageContextRequest>;
  return (
    candidate.type === PAGE_CONTEXT_REQUEST &&
    typeof candidate.tabId === 'number'
  );
}

async function extractPageContent(tabId: number) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url || !/^https?:\/\//i.test(tab.url)) {
    throw new Error(
      'This browser page is protected by Chrome and cannot be read. Open a regular website and try again.',
    );
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: extractSmartPageContent,
    args: [PAGE_CONTENT_LIMITS],
  });
  const content = results[0]?.result;
  if (!content?.text.trim()) {
    throw new Error('No readable text was found on this page.');
  }
  return content;
}

function readableExtractionError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (
    message.includes('Cannot access') ||
    message.includes('The extensions gallery cannot be scripted')
  ) {
    return 'Chrome does not allow extensions to read this page.';
  }
  return message || 'The page could not be read.';
}

export default defineBackground(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to set side panel behavior:', error));

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: ASK_AI_CONTEXT_MENU_ID,
        title: 'AI Helper',
        contexts: ['selection'],
      });
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== ASK_AI_CONTEXT_MENU_ID || !info.selectionText) {
      return;
    }
    const content = createSelectionPageContent({
      text: info.selectionText,
      title: tab?.title,
      url: info.pageUrl ?? tab?.url,
    });
    if (!content) {
      return;
    }

    // Must stay in the synchronous user-gesture handler for Chrome to allow opening.
    const openPanel =
      typeof tab?.id === 'number'
        ? chrome.sidePanel.open({ tabId: tab.id })
        : Promise.resolve();
    const persistContent = chrome.storage.local.set({
      [PENDING_PAGE_CONTENT_KEY]: content,
    });
    void Promise.allSettled([persistContent, openPanel]);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isPageContextRequest(message)) {
      return false;
    }

    void extractPageContent(message.tabId).then(
      (content) => {
        const response: PageContextResponse = { ok: true, content };
        sendResponse(response);
      },
      (error) => {
        const response: PageContextResponse = {
          ok: false,
          error: readableExtractionError(error),
        };
        sendResponse(response);
      },
    );
    return true;
  });
});
