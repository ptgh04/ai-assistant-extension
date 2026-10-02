import type { Message } from '@/conversation';
import type { PageContent } from '@/page-context';

// Curated text-chat models, checked against provider docs on 2026-10-01.
// Keep the first entry stable: it is the default for a newly selected provider.
export const OPENAI_MODELS = [
  { id: 'gpt-6-luna', label: 'GPT-6 Luna' },
  { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' },
  { id: 'gpt-6-astra', label: 'GPT-6 Astra' },
  { id: 'gpt-6-sol', label: 'GPT-6 Sol' },
  { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol' },
  { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna' },
] as const;

export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { id: 'claude-opus-5', label: 'Claude Opus 5' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
] as const;

export const GEMINI_MODELS = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)' },
] as const;

export type ProviderId = 'openai' | 'anthropic' | 'gemini';
export type ResponseLanguage = 'en' | 'vi';

export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', models: OPENAI_MODELS },
  { id: 'anthropic', label: 'Anthropic', models: ANTHROPIC_MODELS },
  { id: 'gemini', label: 'Google Gemini', models: GEMINI_MODELS },
] as const;

export function isProviderId(value: unknown): value is ProviderId {
  return PROVIDERS.some((provider) => provider.id === value);
}

export function getProvider(id: ProviderId) {
  return PROVIDERS.find((provider) => provider.id === id)!;
}

export type OpenAiModel = (typeof OPENAI_MODELS)[number]['id'];

export interface StreamChatOptions {
  apiKey: string;
  provider?: ProviderId;
  model: string;
  messages: Message[];
  pageContent?: PageContent | null;
  responseLanguage?: ResponseLanguage;
  onDelta: (delta: string) => void;
}

export type AiErrorCode =
  | 'invalid_api_key'
  | 'forbidden'
  | 'rate_limit'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_response';

export interface ResponseStreamEvent {
  type: string;
  delta?: string;
  message?: string;
  response?: {
    error?: {
      message?: string;
    } | null;
  };
}
