import { usePageContextStore } from '@/page-context';
import { useChatStore } from '../../stores/chatStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../utils/i18n';

const DEFAULT_PAGE_QUESTION =
  'What is this page about? Explain its main purpose and the most important information.';

export function PageContextBar() {
  const { t } = useI18n();
  const online = useUiStore((state) => state.online);
  const content = usePageContextStore((state) => state.content);
  const isExtracting = usePageContextStore((state) => state.isExtracting);
  const error = usePageContextStore((state) => state.error);
  const captureActivePage = usePageContextStore(
    (state) => state.captureActivePage,
  );
  const clearContent = usePageContextStore((state) => state.clearContent);
  const clearError = usePageContextStore((state) => state.clearError);
  const isChatLoading = useChatStore((state) => state.isLoading);
  const sendMessage = useChatStore((state) => state.sendMessage);

  const askAboutPage = async () => {
    const pageContent = await captureActivePage();
    if (pageContent) {
      await sendMessage(DEFAULT_PAGE_QUESTION, 'page');
    }
  };

  if (!content && !error) {
    return (
      <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2.5">
        <button
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isExtracting || isChatLoading || !online}
          onClick={() => void askAboutPage()}
          type="button"
        >
          <span aria-hidden="true">◎</span>
          {t(isExtracting ? 'Reading this page…' : 'Ask AI about this page')}
        </button>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <p className="min-w-0 flex-1">{error ? t(error) : null}</p>
          <button
            className="rounded-lg px-2 py-1 font-medium hover:bg-red-100"
            onClick={clearError}
            type="button"
          >
            {t('Dismiss')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label={t('Attached page context')}
      className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2.5"
    >
      <div className="selection-card rounded-xl border border-blue-200 bg-blue-50 p-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
              {t(content.source === 'selection' ? 'Selected text is ready' : 'Current page')}
            </p>
            <p className="truncate text-xs font-medium text-slate-800">
              {content.title}
            </p>
          </div>
          <button
            aria-label={t('Remove page context')}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-blue-100"
            onClick={clearContent}
            type="button"
          >
            ×
          </button>
        </div>
        <p className="mt-2 max-h-16 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
          {content.source === 'selection'
            ? content.text
            : `${content.text.slice(0, 320)}${content.text.length > 320 ? '…' : ''}`}
        </p>
        <p className="mt-2 text-[10px] text-slate-400">
          {t('Context size', { characters: content.characterCount.toLocaleString(), tokens: content.estimatedTokens.toLocaleString() })}
          {content.truncated ? t('Context truncated') : ''}
        </p>
      </div>
    </section>
  );
}
