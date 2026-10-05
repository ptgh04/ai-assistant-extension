import { useI18n } from '../../utils/i18n';
import { useConversationStore } from '@/conversation';
import { useSettingsStore } from '@/identity';
import { getProvider } from '@/ai-backend/ai';
import { useUiStore } from '../../stores/uiStore';
import { getExtensionVersion } from '../../utils/getExtensionVersion';

export function ChatHeader() {
  const { t } = useI18n();
  const toggleSettings = useUiStore((state) => state.toggleSettings);
  const openConversationDrawer = useUiStore(
    (state) => state.openConversationDrawer,
  );
  const conversations = useConversationStore((state) => state.conversations);
  const activeConversationId = useConversationStore(
    (state) => state.activeConversationId,
  );
  const model = useSettingsStore((state) => state.model);
  const provider = useSettingsStore((state) => state.provider);
  const vaultStatus = useSettingsStore((state) => state.vaultStatus);
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
      <button
        aria-label={t("Open conversation history")}
        className="header-icon-button grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={openConversationDrawer}
        type="button"
      >
        <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight">
          {activeConversation?.title === 'New Chat' ? t('New Chat') : activeConversation?.title ?? 'AI Helper'}
        </h1>
        <p className="truncate text-[11px] text-slate-500">
          {getProvider(provider).label}{vaultStatus === 'unlocked' ? ` · ${model}` : ''} &middot; v
          {getExtensionVersion()}
        </p>
      </div>

      <button
        aria-label={t("Open settings")}
        className="header-icon-button settings-trigger ml-auto grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={toggleSettings}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.6 3.75h4.8l.55 2.18c.42.17.82.4 1.19.68l2.12-.64 2.4 4.16-1.57 1.54a7 7 0 0 1 0 1.66l1.57 1.54-2.4 4.16-2.12-.64c-.37.28-.77.51-1.19.68l-.55 2.18H9.6l-.55-2.18a7 7 0 0 1-1.19-.68l-2.12.64-2.4-4.16 1.57-1.54a7 7 0 0 1 0-1.66L3.34 10.13l2.4-4.16 2.12.64c.37-.28.77-.51 1.19-.68L9.6 3.75Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.25 12.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      </button>
    </header>
  );
}
