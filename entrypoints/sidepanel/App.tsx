import { useEffect } from 'react';
import { useSettingsStore } from '@/identity';
import { useConversationStore } from '@/conversation';
import { subscribeToPendingPageContent, usePageContextStore } from '@/page-context';
import {
  AiToolsBar, AppLoadingScreen, ChatComposer, ChatHeader, ChatMessageList,
  ConversationDrawer, PageContextBar, SettingsPanel, SetupWizard,
  useChatStore, useUiStore, VaultUnlockScreen,
} from '@/interaction';
import { NetworkBanner } from '@/interaction/components/common/NetworkBanner';
import { useAppearance } from '@/interaction/utils/useAppearance';
import { useI18n } from '@/interaction/utils/i18n';
import { usePreferencesStore } from '@/identity/stores/preferencesStore';

export default function App() {
  useAppearance();
  const { t } = useI18n();
  const preferencesReady = usePreferencesStore((state) => state.hasHydrated);
  const initializeSettings = useSettingsStore((state) => state.initialize);
  const vaultStatus = useSettingsStore((state) => state.vaultStatus);
  const settingsError = useSettingsStore((state) => state.error);
  const initializeChat = useChatStore((state) => state.initialize);
  const initializePageContext = usePageContextStore((state) => state.initialize);
  const receivePageContent = usePageContextStore((state) => state.receivePageContent);
  const content = usePageContextStore((state) => state.content);
  const activeConversationId = useConversationStore((state) => state.activeConversationId);

  useEffect(() => {
    void initializeSettings();
    void initializeChat();
    const unsubscribe = subscribeToPendingPageContent(receivePageContent);
    void initializePageContext();
    return unsubscribe;
  }, [initializeChat, initializePageContext, initializeSettings, receivePageContent]);

  useEffect(() => {
    if (content?.source !== 'selection') return;
    useUiStore.getState().closeSettings();
    useUiStore.getState().closeConversationDrawer();
  }, [content?.capturedAt, content?.source]);

  let screen;
  if (vaultStatus === 'loading' || !preferencesReady) {
    screen = <AppLoadingScreen />;
  } else if (vaultStatus === 'error') {
    screen = <main className="grid place-items-center bg-slate-50 p-5"><div>
      <p role="alert">{settingsError ? t(settingsError) : null}</p>
      <button type="button" onClick={() => void initializeSettings()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white">{t('Retry loading vault')}</button>
    </div></main>;
  } else if (vaultStatus === 'missing') {
    screen = <SetupWizard />;
  } else if (vaultStatus === 'locked') {
    screen = <VaultUnlockScreen />;
  } else {
    screen = (
      <div className="app-shell relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-slate-900">
        <ChatHeader />
        <div className="context-workspace max-h-[46%] shrink-0 overflow-y-auto">
          <PageContextBar />
          <AiToolsBar />
        </div>
        <ChatMessageList />
        <ChatComposer key={activeConversationId} />
        <ConversationDrawer />
        <SettingsPanel />
      </div>
    );
  }
  return <div className="app-viewport"><NetworkBanner />{screen}</div>;
}
