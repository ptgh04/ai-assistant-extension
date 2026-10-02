export type AiActivity = 'chat' | 'page' | 'summarize' | 'explain' | 'translate' | 'rewrite';

export const ACTIVITY_LABELS: Record<AiActivity, string> = {
  chat: 'Chat', page: 'Current page', summarize: 'Summarize',
  explain: 'Explain', translate: 'Translate', rewrite: 'Rewrite',
};

export const ACTIVITY_PROGRESS: Record<AiActivity, string> = {
  chat: 'Thinking…', page: 'Reading this page…', summarize: 'Summarizing…',
  explain: 'Explaining…', translate: 'Translating…', rewrite: 'Rewriting…',
};
