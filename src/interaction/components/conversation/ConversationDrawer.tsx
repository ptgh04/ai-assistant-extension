import { useEffect, useMemo, useState } from 'react';

import { useConversationStore, type Conversation, type Message } from '@/conversation';
import { loadConversationSnapshot } from '@/conversation/storage/conversationStorage';
import { useI18n } from '../../utils/i18n';
import { searchConversations } from '../../utils/searchConversations';
import { useChatStore } from '../../stores/chatStore';
import { useUiStore } from '../../stores/uiStore';
import { ConversationItem } from './ConversationItem';
import { DeleteConfirmation } from './DeleteConfirmation';
import { RenameDialog } from './RenameDialog';

export function ConversationDrawer() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [searchMessages, setSearchMessages] = useState<Message[]>([]);
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const isOpen = useUiStore((state) => state.isConversationDrawerOpen);
  const closeDrawer = useUiStore((state) => state.closeConversationDrawer);
  const conversations = useConversationStore((state) => state.conversations);
  const activeConversationId = useConversationStore(
    (state) => state.activeConversationId,
  );
  const renameConversation = useConversationStore(
    (state) => state.renameConversation,
  );
  const isLoading = useChatStore((state) => state.isLoading || state.isHydrating);
  const newChat = useChatStore((state) => state.newChat);
  const openConversation = useChatStore((state) => state.openConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);

  useEffect(() => {
    if (!isOpen) { setQuery(''); setRenameTarget(null); setDeleteTarget(null); return; }
    let cancelled = false;
    void loadConversationSnapshot().then((snapshot) => {
      if (!cancelled) setSearchMessages(snapshot.messages);
    }).catch(() => { if (!cancelled) setOperationError('Could not load conversation history.'); });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (renameTarget) setRenameTarget(null);
        else if (deleteTarget) setDeleteTarget(null);
        else closeDrawer();
      }
    };
    window.addEventListener('keydown', escape);
    return () => { cancelled = true; window.removeEventListener('keydown', escape); };
  }, [isOpen, conversations, closeDrawer, renameTarget, deleteTarget]);
  const visibleConversations = useMemo(() => searchConversations(conversations, searchMessages, query), [conversations, searchMessages, query]);

  if (!isOpen) {
    return null;
  }

  const run = async (action: () => Promise<void>) => {
    if (working || isLoading) return;
    setWorking(true); setOperationError(null);
    try { await action(); }
    catch { setOperationError('Could not update conversation history. Please try again.'); }
    finally { setWorking(false); }
  };

  const handleRename = async (title: string) => {
    if (!renameTarget) {
      return;
    }
    const targetId = renameTarget.id;
    setRenameTarget(null);
    await run(() => renameConversation(targetId, title));
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    await run(() => deleteConversation(targetId));
  };

  return (
    <>
      <div className="overlay-enter absolute inset-0 z-20 bg-slate-950/25" role="presentation">
        <button
          aria-label={t('Close conversation history')}
          className="overlay-dismiss absolute inset-0 cursor-default"
          onClick={closeDrawer}
          type="button"
        />
        <aside
          aria-label={t('Conversation history')}
          className="history-drawer relative z-10 flex h-full w-[min(92%,360px)] flex-col border-r border-slate-200 bg-slate-50 shadow-xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <h2 className="text-sm font-semibold">{t('Conversations')} <span className="ml-1 text-xs font-normal text-slate-400">{conversations.length}</span></h2>
            <button
              aria-label={t('Close conversation history')}
              className="grid size-8 place-items-center rounded-lg text-lg text-slate-500 hover:bg-slate-100"
              onClick={closeDrawer}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="p-3">
            <button
              className="h-10 w-full rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
              disabled={isLoading || working}
              onClick={() => void run(newChat)}
              type="button"
            >
              {t('+ New Chat')}
            </button>
            <div className="relative mt-3">
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 text-slate-400">⌕</span>
              <input type="search" id="history-search" aria-label={t('Search chats')} placeholder={t('Search chats…')}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-8 text-xs text-slate-800 outline-none focus:border-blue-400"
                value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            {operationError ? <p role="alert" className="text-xs text-red-700">{t(operationError)}</p> : null}
            {visibleConversations.length === 0 ? <div role="status" className="py-10 text-center text-xs text-slate-500"><p className="font-medium">{t('No conversations found')}</p><p className="mt-2">{t('Try another keyword.')}</p></div> : null}
            {visibleConversations.map((conversation) => (
              <ConversationItem
                conversation={conversation}
                disabled={isLoading || working}
                isActive={conversation.id === activeConversationId}
                key={conversation.id}
                onDelete={() => setDeleteTarget(conversation)}
                onOpen={() => void run(() => openConversation(conversation.id))}
                onRename={() => setRenameTarget(conversation)}
              />
            ))}
          </div>
        </aside>
      </div>

      {renameTarget ? (
        <RenameDialog
          conversation={renameTarget}
          onCancel={() => setRenameTarget(null)}
          onRename={handleRename}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteConfirmation
          conversation={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </>
  );
}
