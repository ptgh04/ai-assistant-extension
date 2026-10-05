import type { Conversation, Message } from '@/conversation';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

export function searchConversations(conversations: Conversation[], messages: Message[], query: string): Conversation[] {
  const needle = normalize(query);
  if (!needle) return conversations;
  const matching = new Set(messages.filter((message) => normalize(message.content).includes(needle)).map((message) => message.conversationId));
  return conversations.filter((conversation) => normalize(conversation.title).includes(needle) || matching.has(conversation.id));
}
