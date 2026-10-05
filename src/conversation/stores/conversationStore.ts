import { create } from 'zustand';

import {
  loadConversationSnapshot,
  saveConversations,
  saveConversationSnapshot,
} from '../storage/conversationStorage';
import type { Conversation } from '../types';

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  hasHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  createConversation: () => Promise<Conversation>;
  setActiveConversation: (conversationId: string) => Promise<void>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<string>;
  touchConversation: (
    conversationId: string,
    suggestedTitle?: string,
  ) => Promise<void>;
}

function createConversationRecord(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    createdAt: now,
    updatedAt: now,
  };
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort(
    (left, right) => right.updatedAt - left.updatedAt,
  );
}

function suggestedConversationTitle(content: string): string {
  const normalized = content.replaceAll(/\s+/g, ' ').trim();
  return normalized.length > 44 ? `${normalized.slice(0, 44)}…` : normalized;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  hasHydrated: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    if (get().hasHydrated || get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const snapshot = await loadConversationSnapshot();
      let conversations = sortConversations(snapshot.conversations);
      let activeConversationId = snapshot.activeConversationId;

      if (conversations.length === 0) {
        const initialConversation = createConversationRecord();
        conversations = [initialConversation];
        activeConversationId = initialConversation.id;
        await saveConversationSnapshot({
          conversations,
          messages: snapshot.messages,
          activeConversationId,
        });
      } else if (
        !activeConversationId ||
        !conversations.some((conversation) => conversation.id === activeConversationId)
      ) {
        activeConversationId = conversations[0].id;
        await saveConversations(conversations, activeConversationId);
      }

      set({
        conversations,
        activeConversationId,
        hasHydrated: true,
        isLoading: false,
      });
    } catch {
      set({
        isLoading: false,
        error: 'Could not load conversation history.',
      });
    }
  },

  createConversation: async () => {
    const conversation = createConversationRecord();
    const conversations = [conversation, ...get().conversations];
    await saveConversations(conversations, conversation.id);
    set({ conversations, activeConversationId: conversation.id, error: null });
    return conversation;
  },

  setActiveConversation: async (conversationId) => {
    if (!get().conversations.some((item) => item.id === conversationId)) {
      return;
    }
    await saveConversations(get().conversations, conversationId);
    set({ activeConversationId: conversationId, error: null });
  },

  renameConversation: async (conversationId, title) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return;
    }
    const conversations = get().conversations.map((conversation) =>
      conversation.id === conversationId
        ? { ...conversation, title: normalizedTitle, updatedAt: Date.now() }
        : conversation,
    );
    const sorted = sortConversations(conversations);
    await saveConversations(sorted, get().activeConversationId);
    set({ conversations: sorted, error: null });
  },

  deleteConversation: async (conversationId) => {
    const snapshot = await loadConversationSnapshot();
    let conversations = snapshot.conversations.filter(
      (conversation) => conversation.id !== conversationId,
    );
    const messages = snapshot.messages.filter(
      (message) => message.conversationId !== conversationId,
    );

    const previousActiveConversationId = snapshot.activeConversationId;
    let activeConversationId = previousActiveConversationId;
    if (!activeConversationId || activeConversationId === conversationId ||
        !conversations.some((item) => item.id === activeConversationId)) {
      const blank = createConversationRecord();
      conversations = [blank, ...conversations];
      activeConversationId = blank.id;
    }
    conversations = sortConversations(conversations);
    await saveConversationSnapshot({
      conversations,
      messages,
      activeConversationId,
    });
    set({ conversations, activeConversationId, error: null });
    return activeConversationId;
  },

  touchConversation: async (conversationId, suggestedTitle) => {
    const conversations = get().conversations.map((conversation) => {
      if (conversation.id !== conversationId) {
        return conversation;
      }
      return {
        ...conversation,
        title:
          conversation.title === 'New Chat' && suggestedTitle
            ? suggestedConversationTitle(suggestedTitle)
            : conversation.title,
        updatedAt: Date.now(),
      };
    });
    const sorted = sortConversations(conversations);
    await saveConversations(sorted, get().activeConversationId);
    set({ conversations: sorted });
  },
}));
