import { useEffect, useRef, useState } from 'react';
import {
  buildExplainPrompt, buildRewritePrompt, buildSummarizePrompt, buildTranslatePrompt,
  REWRITE_STYLES, TRANSLATION_LANGUAGES, type RewriteStyle, type TranslationLanguage,
} from '@/ai-backend/ai';
import { usePageContextStore } from '@/page-context';
import { useChatStore } from '../../stores/chatStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../utils/i18n';
import { ACTIVITY_PROGRESS, type AiActivity } from '../../utils/activity';

export function AiToolsBar() {
  const { t } = useI18n();
  const [translationLanguage, setTranslationLanguage] = useState<TranslationLanguage>('Auto');
  const [rewriteStyle, setRewriteStyle] = useState<RewriteStyle>('Professional');
  const content = usePageContextStore((state) => state.content);
  const isExtracting = usePageContextStore((state) => state.isExtracting);
  const captureActivePage = usePageContextStore((state) => state.captureActivePage);
  const isChatLoading = useChatStore((state) => state.isLoading || state.isHydrating);
  const activity = useChatStore((state) => state.activity);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const online = useUiStore((state) => state.online);
  const isBusy = isExtracting || isChatLoading;
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (content?.source === 'selection') heading.current?.focus({ preventScroll: true });
  }, [content?.capturedAt, content?.source]);

  const runTool = async (prompt: string, task: AiActivity) => {
    if (isBusy || !online) return;
    const pageContent = content ?? (await captureActivePage());
    if (pageContent) await sendMessage(prompt, task);
  };

  const toolButton = (label: string, icon: string, task: AiActivity, prompt: string) => (
    <button className="tool-button" disabled={isBusy || !online} data-active={isChatLoading && activity === task}
      aria-busy={(isChatLoading && activity === task) || undefined}
      onClick={() => void runTool(prompt, task)} type="button" data-action={task}>
      <span className="tool-icon" aria-hidden="true">{icon}</span>
      <span>{t(isChatLoading && activity === task ? ACTIVITY_PROGRESS[task] : label)}</span>
    </button>
  );

  return (
    <section aria-label={t('AI tools')} className="actions-panel px-3 pb-3 pt-2" data-testid="ai-actions">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 ref={heading} tabIndex={-1} className="text-xs font-semibold text-slate-700 outline-none">
          {t(content?.source === 'selection' ? 'Choose an action' : 'AI Tools')}
        </h2>
        <span className="truncate text-[10px] text-slate-500">{t(content ? content.source === 'selection' ? 'Using selected text' : 'Using current page' : 'Reads current page when used')}</span>
      </div>
      <div className="action-grid grid grid-cols-2 gap-2">
        {toolButton('Summarize', '≡', 'summarize', buildSummarizePrompt())}
        {toolButton('Explain', '✧', 'explain', buildExplainPrompt())}
        <div className="tool-group">
          {toolButton('Translate', '文', 'translate', buildTranslatePrompt(translationLanguage))}
          <select aria-label={t('Translation language')} id="translation-language" className="tool-select"
            disabled={isBusy} value={translationLanguage} onChange={(event) => setTranslationLanguage(event.target.value as TranslationLanguage)}>
            {TRANSLATION_LANGUAGES.map((language) => <option key={language} value={language}>{t(language)}</option>)}
          </select>
        </div>
        <div className="tool-group">
          {toolButton('Rewrite', '↗', 'rewrite', buildRewritePrompt(rewriteStyle))}
          <select aria-label={t('Rewrite style')} className="tool-select" disabled={isBusy} value={rewriteStyle}
            onChange={(event) => setRewriteStyle(event.target.value as RewriteStyle)}>
            {REWRITE_STYLES.map((style) => <option key={style} value={style}>{t(style)}</option>)}
          </select>
        </div>
      </div>
      {translationLanguage === 'Auto' ? <p className="mt-2 text-[10px] leading-4 text-slate-500">{t('Auto: Vietnamese → English; other languages → Vietnamese.')}</p> : null}
    </section>
  );
}
