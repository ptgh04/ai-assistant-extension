export const TRANSLATION_LANGUAGES = ['Auto', 'Vietnamese', 'English'] as const;
export const REWRITE_STYLES = [
  'Formal',
  'Simple',
  'Shorter',
  'Professional',
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];
export type RewriteStyle = (typeof REWRITE_STYLES)[number];

export function buildSummarizePrompt(): string {
  return [
    'Summarize the attached PageContent clearly and accurately.',
    'Start with a concise overview, then list the most important points.',
    'Do not add claims that are not supported by the source.',
  ].join(' ');
}

export function buildExplainPrompt(): string {
  return [
    'Explain the attached PageContent in plain, easy-to-understand language.',
    'Clarify difficult terms and preserve the original meaning.',
    'Use a short example only when it materially improves understanding.',
  ].join(' ');
}

export function buildTranslatePrompt(
  language: TranslationLanguage,
): string {
  return [
    language === 'Auto'
      ? 'Detect the main language of the attached PageContent. If it is Vietnamese, translate it into English. Otherwise, translate it into Vietnamese.'
      : `Translate the attached PageContent into ${language}.`,
    'Preserve meaning, names, numbers, URLs, and useful formatting.',
    'Return only the translation unless a short clarification is necessary.',
  ].join(' ');
}

export function buildRewritePrompt(style: RewriteStyle): string {
  const styleInstruction: Record<RewriteStyle, string> = {
    Formal: 'Use a formal tone and polished sentence structure.',
    Simple: 'Use simple words and short, clear sentences.',
    Shorter: 'Make it substantially shorter while preserving the key meaning.',
    Professional: 'Use a concise, confident, professional tone.',
  };

  return [
    `Rewrite the attached PageContent in the ${style.toLowerCase()} style.`,
    styleInstruction[style],
    'Preserve factual meaning and do not introduce new claims.',
    'Return only the rewritten text.',
  ].join(' ');
}
