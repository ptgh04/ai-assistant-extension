import type {
  Conversation,
  ConversationSnapshot,
  Message,
} from '../types';

const CONVERSATIONS_KEY = 'aiHelperConversations';
const MESSAGES_KEY = 'aiHelperMessages';
const ACTIVE_CONVERSATION_KEY = 'aiHelperActiveConversationId';

export const MAX_CONTEXT_MESSAGES = 20;

export async function loadConversationSnapshot(): Promise<ConversationSnapshot> {
  const stored = await chrome.storage.local.get([
    CONVERSATIONS_KEY,
    MESSAGES_KEY,
    ACTIVE_CONVERSATION_KEY,
  ]);

  return {
    conversations: Array.isArray(stored[CONVERSATIONS_KEY])
      ? (stored[CONVERSATIONS_KEY] as Conversation[])
      : [],
    messages: Array.isArray(stored[MESSAGES_KEY])
      ? (stored[MESSAGES_KEY] as Message[])
      : [],
    activeConversationId:
      typeof stored[ACTIVE_CONVERSATION_KEY] === 'string'
        ? (stored[ACTIVE_CONVERSATION_KEY] as string)
        : null,
  };
}

export async function saveConversationSnapshot(
  snapshot: ConversationSnapshot,
): Promise<void> {
  await chrome.storage.local.set({
    [CONVERSATIONS_KEY]: snapshot.conversations,
    [MESSAGES_KEY]: snapshot.messages,
    [ACTIVE_CONVERSATION_KEY]: snapshot.activeConversationId,
  });
}

export async function saveConversations(
  conversations: Conversation[],
  activeConversationId: string | null,
): Promise<void> {
  await chrome.storage.local.set({
    [CONVERSATIONS_KEY]: conversations,
    [ACTIVE_CONVERSATION_KEY]: activeConversationId,
  });
}

export async function appendMessage(message: Message): Promise<void> {
  const snapshot = await loadConversationSnapshot();
  await chrome.storage.local.set({
    [MESSAGES_KEY]: snapshot.messages.some((existing) => existing.id === message.id)
      ? snapshot.messages
      : [...snapshot.messages, message],
  });
}

export async function getConversationMessages(
  conversationId: string,
): Promise<Message[]> {
  const snapshot = await loadConversationSnapshot();
  return snapshot.messages
    .filter((message) => message.conversationId === conversationId)
    .sort((left, right) => left.timestamp - right.timestamp);
}

export async function getRecentConversationMessages(
  conversationId: string,
  limit = MAX_CONTEXT_MESSAGES,
): Promise<Message[]> {
  const messages = await getConversationMessages(conversationId);
  return messages.slice(-limit);
}
