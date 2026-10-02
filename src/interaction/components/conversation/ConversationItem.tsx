import { useI18n } from '../../utils/i18n';
import type { Conversation } from '@/conversation';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  disabled: boolean;
  onDelete: () => void;
  onOpen: () => void;
  onRename: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  disabled,
  onDelete,
  onOpen,
  onRename,
}: ConversationItemProps) {
  const { t, language } = useI18n();
  const date = new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
  }).format(conversation.updatedAt);

  return (
    <article
      className={`history-item rounded-xl border p-2 ${
        isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
      }`}
    >
      <button
        className="w-full rounded-lg px-2 py-1.5 text-left disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onOpen}
        type="button"
      >
        <span className="block truncate text-sm font-medium text-slate-800">
          {conversation.title === 'New Chat' ? t('New Chat') : conversation.title}
        </span>
        <span className="mt-0.5 block text-[10px] text-slate-400">{date}</span>
      </button>
      <div className="mt-1 flex justify-end gap-1 border-t border-slate-100 pt-1.5">
        <button
          className="rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          disabled={disabled}
          onClick={onRename}
          type="button"
        >{t("Rename")}</button>
        <button
          className="rounded-md px-2 py-1 text-[11px] text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
          disabled={disabled}
          onClick={onDelete}
          type="button"
        >{t("Delete")}</button>
      </div>
    </article>
  );
}
