export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface ConversationSnapshot {
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string | null;
}
