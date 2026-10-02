import { create } from 'zustand';

import { AiServiceError, streamChatCompletion } from '@/ai-backend/ai';
import {
  appendMessage,
  getConversationMessages,
  getRecentConversationMessages,
  useConversationStore,
} from '@/conversation';
import { getCachedApiKey, useSettingsStore } from '@/identity';
import { usePageContextStore } from '@/page-context';
import type { ChatMessage } from '../types/chat';
import { useUiStore } from './uiStore';
import { ACTIVITY_LABELS, type AiActivity } from '../utils/activity';
import { translate } from '../utils/i18n';
import { usePreferencesStore } from '@/identity/stores/preferencesStore';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isHydrating: boolean;
  status: 'idle' | 'loading' | 'streaming' | 'success' | 'error';
  error: string | null;
  activity: AiActivity;
  initialize: () => Promise<void>;
  newChat: () => Promise<void>;
  openConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, activity?: AiActivity) => Promise<boolean>;
  clearError: () => void;
}

function createMessage(
  conversationId: string,
  role: ChatMessage['role'],
  content: string,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    conversationId,
    role,
    content,
    timestamp: Date.now(),
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isHydrating: false,
  status: 'idle',
  error: null,
  activity: 'chat',

  initialize: async () => {
    if (get().isHydrating) {
      return;
    }
    set({ isHydrating: true, error: null });
    try {
      await useConversationStore.getState().hydrate();
      if (useConversationStore.getState().error) throw new Error('History unavailable');
      const conversationId =
        useConversationStore.getState().activeConversationId;
      const messages = conversationId
        ? await getConversationMessages(conversationId)
        : [];
      set({ messages, isHydrating: false });
    } catch {
      set({
        isHydrating: false,
        error: 'Could not load the active conversation.',
      });
    }
  },

  newChat: async () => {
    if (get().isLoading || get().isHydrating) {
      return;
    }
    set({ isHydrating: true });
    try {
      await useConversationStore.getState().createConversation();
      usePageContextStore.getState().clearContent();
      set({ messages: [], error: null, status: 'idle', activity: 'chat' });
      useUiStore.getState().closeConversationDrawer();
    } finally { set({ isHydrating: false }); }
  },

  openConversation: async (conversationId) => {
    if (get().isLoading || get().isHydrating) {
      return;
    }
    set({ isHydrating: true });
    try {
      if (!useConversationStore.getState().conversations.some((item) => item.id === conversationId)) return;
      await useConversationStore.getState().setActiveConversation(conversationId);
      const messages = await getConversationMessages(conversationId);
      usePageContextStore.getState().clearContent();
      set({ messages, error: null, status: 'idle', activity: 'chat' });
      useUiStore.getState().closeConversationDrawer();
    } finally { set({ isHydrating: false }); }
  },

  deleteConversation: async (conversationId) => {
    if (get().isLoading || get().isHydrating) {
      return;
    }
    const removedActive = useConversationStore.getState().activeConversationId === conversationId;
    set({ isHydrating: true });
    try {
      await useConversationStore.getState().deleteConversation(conversationId);
      if (removedActive) {
        usePageContextStore.getState().clearContent();
        set({ messages: [], error: null, status: 'idle', activity: 'chat' });
      }
    } finally { set({ isHydrating: false }); }
  },

  sendMessage: async (content, activity = 'chat') => {
    const normalizedContent = content.trim();
    if (!normalizedContent || get().isLoading || get().isHydrating) return false;
    if (!useUiStore.getState().online) {
      set({ error: 'You are offline. Reconnect before sending a request.', status: 'error' });
      return false;
    }
    const settings = useSettingsStore.getState();
    const apiKey = getCachedApiKey(settings.provider);
    if (!apiKey || !settings.beginRequest()) {
      set({ error: 'Unlock the vault and save a key for the selected provider before sending.' });
      return false;
    }

    // Freeze context and language at click time; changes apply to the next request.
    const pageContent = usePageContextStore.getState().content;
    // Translation has an explicit target (including Auto) in its own prompt.
    const responseLanguage = activity === 'translate' ? undefined : usePreferencesStore.getState().responseLanguage;
    set({ isLoading: true, status: 'loading', error: null, activity });
    let assistantContent = '';
    let conversationId: string | null = null;
    const assistantMessageId = crypto.randomUUID();
    const assistantTimestamp = Date.now();
    let assistantSaved = false;
    let userSaved = false;

    const persistAssistant = async () => {
      if (!conversationId || !assistantContent || assistantSaved) return;
      await appendMessage({
        id: assistantMessageId, conversationId, role: 'assistant',
        content: assistantContent, timestamp: assistantTimestamp,
      });
      assistantSaved = true;
    };

    try {
      conversationId = useConversationStore.getState().activeConversationId ??
        (await useConversationStore.getState().createConversation()).id;
      const currentId = conversationId;
      const userMessage = createMessage(currentId, 'user', normalizedContent);
      await appendMessage(userMessage);
      userSaved = true;
      set((state) => ({ messages: [...state.messages, userMessage] }));
      const title = activity === 'chat' ? normalizedContent
        : `${translate(ACTIVITY_LABELS[activity], usePreferencesStore.getState().language)} · ${pageContent?.title || pageContent?.text.slice(0, 40) || 'AI Helper'}`;
      await useConversationStore.getState().touchConversation(currentId, title);
      const requestMessages = await getRecentConversationMessages(currentId);

      await streamChatCompletion({
        apiKey, provider: settings.provider, model: settings.model, messages: requestMessages, pageContent, responseLanguage,
        onDelta: (delta) => {
          assistantContent += delta;
          set((state) => ({
            status: 'streaming',
            messages: state.messages.some((message) => message.id === assistantMessageId)
              ? state.messages.map((message) => message.id === assistantMessageId
                ? { ...message, content: assistantContent } : message)
              : [...state.messages, {
                id: assistantMessageId, conversationId: currentId,
                role: 'assistant', content: assistantContent, timestamp: assistantTimestamp,
              }],
          }));
        },
      });
      if (!assistantContent) throw new AiServiceError('invalid_response', 'The AI service returned an empty response.');
      await persistAssistant();
      await useConversationStore.getState().touchConversation(currentId);
      set({ status: 'success', error: null });
    } catch (error) {
      let storageFailed = false;
      try { await persistAssistant(); } catch { storageFailed = true; }
      set({
        status: 'error',
        error: storageFailed
          ? 'The response is visible but could not be saved. Copy it before closing the panel.'
          : error instanceof AiServiceError ? error.message
          : 'Could not save the conversation. Check local storage and try again.',
      });
    } finally {
      set({ isLoading: false });
      useSettingsStore.getState().finishRequest();
    }
    return userSaved;
  },
  clearError: () => set({ error: null }),
}));
