import { create } from 'zustand';

import {
  AiServiceError,
  testConnection,
  getProvider,
  type ProviderId,
} from '@/ai-backend/ai';
import {
  createVault,
  getCachedApiKey,
  getVaultRecord,
  getVaultModels,
  hasCachedApiKeys,
  lockVault,
  resetVault,
  validateCredentials,
  unlockVault,
  updateVaultModel,
  VaultError,
  type VaultStatus,
} from '../security';

const DEFAULT_MODEL = 'gpt-6-luna';

interface SettingsState {
  provider: ProviderId;
  model: string;
  providerModels: Partial<Record<ProviderId, string>>;
  setProvider: (provider: ProviderId) => void;
  vaultStatus: VaultStatus;
  isSaving: boolean;
  isTesting: boolean;
  requestActive: boolean;
  lockPending: boolean;
  error: string | null;
  success: string | null;
  initialize: () => Promise<void>;
  setModel: (model: string) => void;
  saveCredentials: (apiKey: string, passphrase: string) => Promise<boolean>;
  unlock: (passphrase: string) => Promise<boolean>;
  saveModel: () => Promise<boolean>;
  testDraftConnection: (apiKey: string) => Promise<boolean>;
  testSavedConnection: () => Promise<boolean>;
  lock: () => void;
  beginRequest: () => boolean;
  finishRequest: () => void;
  reset: (confirmation: string) => Promise<boolean>;
  clearNotice: () => void;
}

function errorMessage(error: unknown): string {
  if (error instanceof AiServiceError || error instanceof VaultError) {
    return error.message;
  }
  return 'An unexpected settings error occurred.';
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  provider: 'openai',
  model: DEFAULT_MODEL,
  providerModels: {},
  vaultStatus: 'loading',
  isSaving: false,
  isTesting: false,
  requestActive: false,
  lockPending: false,
  error: null,
  success: null,

  initialize: async () => {
    try {
      const record = await getVaultRecord();
      set({
        provider: record?.provider ?? 'openai',
        model: record?.model ?? DEFAULT_MODEL,
        providerModels: record ? getVaultModels(record) : {},
        vaultStatus: record
          ? hasCachedApiKeys()
            ? 'unlocked'
            : 'locked'
          : 'missing',
        error: null,
      });
    } catch (error) {
      set({
        vaultStatus: 'error',
        error: error instanceof VaultError ? error.message : 'Could not read settings from local storage. Try again.',
      });
    }
  },

  setProvider: (provider) => {
    if (get().requestActive || get().isSaving || get().isTesting || get().lockPending) return;
    set({ provider, model: get().providerModels[provider] ?? getProvider(provider).models[0].id, error: null, success: null });
  },

  setModel: (model) => {
    if (get().requestActive || get().isSaving || get().isTesting || get().lockPending) return;
    set({ model, success: null, error: null });
  },

  saveCredentials: async (apiKey, passphrase) => {
    if (get().isSaving || get().isTesting || get().requestActive) return false;
    set({ isSaving: true, error: null, success: null });
    try {
      validateCredentials(apiKey, passphrase);
      const { provider, model } = get();
      await testConnection(provider, apiKey, model);
      const record = await createVault(apiKey, passphrase, model, provider);
      set({
        vaultStatus: 'unlocked',
        providerModels: getVaultModels(record),
        isSaving: false,
        success: 'API key validated, encrypted, and saved locally.',
      });
      return true;
    } catch (error) {
      set({ isSaving: false, error: errorMessage(error) });
      return false;
    }
  },

  unlock: async (passphrase) => {
    if (get().isSaving || get().isTesting || get().requestActive) return false;
    set({ isSaving: true, error: null, success: null });
    try {
      const record = await unlockVault(passphrase);
      set({
        provider: record.provider,
        model: record.model,
        providerModels: getVaultModels(record),
        vaultStatus: 'unlocked',
        isSaving: false,
        success: 'Vault unlocked for this Side Panel session.',
      });
      return true;
    } catch (error) {
      set({ isSaving: false, error: errorMessage(error) });
      return false;
    }
  },

  saveModel: async () => {
    if (get().vaultStatus !== 'unlocked' || get().requestActive || get().isSaving || get().isTesting || !getCachedApiKey(get().provider)) return false;
    set({ isSaving: true, error: null, success: null });
    try {
      const record = await updateVaultModel(get().model, get().provider);
      set({ providerModels: getVaultModels(record), isSaving: false, success: 'Provider and model saved.' });
      return true;
    } catch (error) {
      set({ isSaving: false, error: errorMessage(error) });
      return false;
    }
  },

  testDraftConnection: async (apiKey) => {
    if (get().isTesting || get().isSaving || get().requestActive) return false;
    set({ isTesting: true, error: null, success: null });
    try {
      await testConnection(get().provider, apiKey, get().model);
      set({ isTesting: false, success: 'Connection successful.' });
      return true;
    } catch (error) {
      set({ isTesting: false, error: errorMessage(error) });
      return false;
    }
  },

  testSavedConnection: async () => {
    if (get().isTesting || get().isSaving || get().requestActive) return false;
    const apiKey = getCachedApiKey(get().provider);
    if (!apiKey) {
      set({ error: 'Unlock the vault and save a key for the selected provider before testing.' });
      return false;
    }

    set({ isTesting: true, error: null, success: null });
    try {
      await testConnection(get().provider, apiKey, get().model);
      set({ isTesting: false, success: 'Connection successful.' });
      return true;
    } catch (error) {
      set({ isTesting: false, error: errorMessage(error) });
      return false;
    }
  },

  lock: () => {
    if (get().isSaving || get().isTesting) return;
    if (get().requestActive) {
      set({ lockPending: true, success: 'Vault will lock after the current response finishes.' });
      return;
    }
    lockVault();
    set({ vaultStatus: 'locked', lockPending: false, success: null, error: null });
  },

  beginRequest: () => {
    if (get().vaultStatus !== 'unlocked' || get().lockPending || get().requestActive || get().isSaving || get().isTesting || !getCachedApiKey(get().provider)) return false;
    set({ requestActive: true });
    return true;
  },

  finishRequest: () => {
    set({ requestActive: false });
    if (get().lockPending) get().lock();
  },

  reset: async (confirmation) => {
    if (confirmation !== 'RESET' || get().requestActive || get().isSaving || get().isTesting) return false;
    set({ isSaving: true, error: null });
    try {
      await resetVault();
      set({ vaultStatus: 'missing', provider: 'openai', model: DEFAULT_MODEL, providerModels: {}, isSaving: false, success: null, lockPending: false });
      return true;
    } catch {
      set({ isSaving: false, error: 'Could not remove the vault. Your conversations were not changed.' });
      return false;
    }
  },

  clearNotice: () => set({ error: null, success: null }),
}));
