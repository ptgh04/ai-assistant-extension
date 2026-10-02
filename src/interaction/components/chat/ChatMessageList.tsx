import { useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useI18n } from '../../utils/i18n';
import { ACTIVITY_LABELS, ACTIVITY_PROGRESS } from '../../utils/activity';
import { ErrorBanner } from '../common/ErrorBanner';
import { VaultStatusBanner } from '../common/VaultStatusBanner';
import { EmptyState } from './EmptyState';
import { MessageBubble } from './MessageBubble';

export function ChatMessageList() {
  const { t } = useI18n();
  const { messages, isLoading, status, isHydrating, error, activity, clearError } = useChatStore();
  const scrollRef = useRef<HTMLElement>(null);
  const following = useRef(true);

  useEffect(() => { if (isLoading) following.current = true; }, [isLoading]);

  useEffect(() => {
    if (following.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, error]);

  return (
    <main aria-label={t('Conversation')} ref={scrollRef}
      onScroll={(event) => { const el = event.currentTarget; following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
      className="chat-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <VaultStatusBanner />
      {isHydrating ? <p role="status" className="mb-3 text-xs text-slate-500">{t('Loading history…')}</p> : null}
      {messages.length === 0 && !isLoading && !error ? <EmptyState /> : (
        <div className="space-y-4">
          {messages.map((message, index) => <MessageBubble key={message.id} message={message}
            isStreaming={isLoading && status === 'streaming' && index === messages.length - 1} />)}
          {isLoading ? (
            <div className="activity-card" role="status" aria-live="polite" data-testid="ai-activity">
              <span className="activity-orbit" aria-hidden="true">✦</span>
              <div>
                <h3 className="text-xs font-semibold text-slate-800">{t(ACTIVITY_PROGRESS[activity])}</h3>
                <p className="mt-1 text-[11px] text-slate-500">{t(status === 'streaming' ? 'Streaming…' : 'Waiting for AI…')}</p>
              </div>
              <span className="activity-dots ml-auto" aria-hidden="true"><i /><i /><i /></span>
            </div>
          ) : status === 'success' ? <p role="status" className="success-notice flex items-center gap-1.5 text-[11px] text-emerald-700"><span className="success-check" aria-hidden="true">✓</span>{t(ACTIVITY_LABELS[activity])} · {t('Response saved.')}</p> : null}
          {error ? <ErrorBanner message={error} onDismiss={clearError} /> : null}
        </div>
      )}
    </main>
  );
}
