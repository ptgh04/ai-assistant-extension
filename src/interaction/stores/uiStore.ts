import { create } from 'zustand';

interface UiState {
  online: boolean;
  setOnline: (online: boolean) => void;
  isConversationDrawerOpen: boolean;
  isSettingsOpen: boolean;
  openConversationDrawer: () => void;
  closeConversationDrawer: () => void;
  openSettings: () => void;
  toggleSettings: () => void;
  closeSettings: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  online: true,
  setOnline: (online) => set({ online }),
  isConversationDrawerOpen: false,
  isSettingsOpen: false,
  openConversationDrawer: () =>
    set({ isConversationDrawerOpen: true, isSettingsOpen: false }),
  closeConversationDrawer: () => set({ isConversationDrawerOpen: false }),
  openSettings: () =>
    set({ isSettingsOpen: true, isConversationDrawerOpen: false }),
  toggleSettings: () =>
    set((state) => ({
      isSettingsOpen: !state.isSettingsOpen,
      isConversationDrawerOpen: false,
    })),
  closeSettings: () => set({ isSettingsOpen: false }),
}));
