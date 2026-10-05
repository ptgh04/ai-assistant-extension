import { create } from 'zustand';

import {
  consumePendingPageContent,
  extractActivePageContent,
  PageContextError,
} from '../services/pageContextClient';
import type { PageContent } from '../types';

interface PageContextState {
  content: PageContent | null;
  isExtracting: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  captureActivePage: () => Promise<PageContent | null>;
  receivePageContent: (content: PageContent) => void;
  clearContent: () => void;
  clearError: () => void;
}

export const usePageContextStore = create<PageContextState>((set, get) => ({
  content: null,
  isExtracting: false,
  error: null,

  initialize: async () => {
    try {
      const content = await consumePendingPageContent();
      if (content) {
        set({ content, error: null });
      }
    } catch {
      set({ error: 'Selected text could not be loaded.' });
    }
  },

  captureActivePage: async () => {
    if (get().isExtracting) {
      return null;
    }
    set({ isExtracting: true, error: null });
    try {
      const content = await extractActivePageContent();
      set({ content, isExtracting: false });
      return content;
    } catch (error) {
      set({
        isExtracting: false,
        error:
          error instanceof PageContextError
            ? error.message
            : 'The page could not be read.',
      });
      return null;
    }
  },

  receivePageContent: (content) => set({ content, error: null }),
  clearContent: () => set({ content: null, error: null }),
  clearError: () => set({ error: null }),
}));

