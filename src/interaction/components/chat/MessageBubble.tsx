import { useI18n } from '../../utils/i18n';
import type { ChatMessage } from '../../types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useI18n();
  const isUser = message.role === 'user';

  return (
    <article
      aria-label={isUser ? t('You') : 'AI Helper'}
      className={`message-enter flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm ${
          isUser
            ? 'rounded-br-md bg-blue-600 text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
        }`}
      >
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-65">{isUser ? t('You') : 'AI Helper'}</p>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </article>
  );
}
