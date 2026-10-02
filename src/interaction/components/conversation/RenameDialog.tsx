import { useI18n } from '../../utils/i18n';
import { useState, type FormEvent } from 'react';

import type { Conversation } from '@/conversation';

interface RenameDialogProps {
  conversation: Conversation;
  onCancel: () => void;
  onRename: (title: string) => Promise<void>;
}

export function RenameDialog({
  conversation,
  onCancel,
  onRename,
}: RenameDialogProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(conversation.title);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim()) {
      void onRename(title);
    }
  };

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/35 p-4">
      <form
        aria-labelledby="rename-title"
        aria-modal="true"
        className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <h2 className="text-sm font-semibold" id="rename-title">{t("Rename conversation")}</h2>
        <input
          aria-label={t('Conversation title')}
          id="conversation-title"
          autoFocus
          className="mt-3 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium" onClick={onCancel} type="button">{t("Cancel")}</button>
          <button className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white disabled:bg-slate-300" disabled={!title.trim()} type="submit">{t("Rename")}</button>
        </div>
      </form>
    </div>
  );
}
