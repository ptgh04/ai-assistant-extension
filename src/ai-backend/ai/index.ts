export {
  AiServiceError,
  streamChatCompletion,
  testOpenAiConnection,
  testConnection,
} from './client';
export {
  buildExplainPrompt,
  buildRewritePrompt,
  buildSummarizePrompt,
  buildTranslatePrompt,
  REWRITE_STYLES,
  TRANSLATION_LANGUAGES,
} from './promptBuilder';
export { OPENAI_MODELS, PROVIDERS, getProvider, isProviderId } from './types';
export type {
  RewriteStyle,
  TranslationLanguage,
} from './promptBuilder';
export type { AiErrorCode, OpenAiModel, ProviderId, ResponseLanguage } from './types';
