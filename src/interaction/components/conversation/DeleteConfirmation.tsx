import { useI18n } from '../../utils/i18n';
import type { Conversation } from '@/conversation';

interface DeleteConfirmationProps {
  conversation: Conversation;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmation({
  conversation,
  onCancel,
  onConfirm,
}: DeleteConfirmationProps) {
  const { t } = useI18n();
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/35 p-4">
      <section
        aria-labelledby="delete-title"
        aria-modal="true"
        className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl"
        role="alertdialog"
      >
        <h2 className="text-sm font-semibold" id="delete-title">{t("Delete conversation?")}</h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {t('Delete explanation', { title: conversation.title === 'New Chat' ? t('New Chat') : conversation.title })}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium" onClick={onCancel} type="button">{t("Cancel")}</button>
          <button className="h-9 rounded-lg bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700" onClick={() => void onConfirm()} type="button">{t("Delete")}</button>
        </div>
      </section>
    </div>
  );
}
