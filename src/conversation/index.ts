/**
 * Conversation Bounded Context
 * Responsibility: Chat threads, message history, context binding, memory management.
 * See CONTEXT.md & ADR-006, ADR-016.
 */

export {
  appendMessage,
  getConversationMessages,
  getRecentConversationMessages,
  MAX_CONTEXT_MESSAGES,
} from './storage/conversationStorage';
export { useConversationStore } from './stores/conversationStore';
export type { Conversation, Message, MessageRole } from './types';
