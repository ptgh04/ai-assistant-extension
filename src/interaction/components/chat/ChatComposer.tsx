import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../utils/i18n';
import { useState, type FormEvent, type KeyboardEvent } from 'react';

import { useChatStore } from '../../stores/chatStore';

export function ChatComposer() {
  const { t } = useI18n();
  const online = useUiStore((state) => state.online);
  const [draft, setDraft] = useState('');
  const isLoading = useChatStore((state) => state.isLoading);
  const isHydrating = useChatStore((state) => state.isHydrating);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const canSend = draft.trim().length > 0 && !isLoading && !isHydrating && online;

  const submit = async () => {
    if (!canSend) {
      return;
    }

    const message = draft;
    const accepted = await sendMessage(message);
    if (accepted) setDraft('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form
      className="shrink-0 border-t border-slate-200 bg-white p-3"
      onSubmit={handleSubmit}
    >
      <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-1.5 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <label className="sr-only" htmlFor="chat-input">{t("Ask AI")}</label>
        <textarea
          className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-5 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading || isHydrating}
          id="chat-input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t(isLoading ? 'Waiting for response…' : 'Ask AI…')}
          rows={1}
          value={draft}
        />
        <button
          className="h-10 shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canSend}
          type="submit"
        >
          {t(isLoading ? 'Sending…' : 'Send')}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-slate-400">{t('Enter to send · Shift + Enter for a new line')}</p>
    </form>
  );
}
