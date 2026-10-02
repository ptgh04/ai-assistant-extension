import { create } from 'zustand';
import type { ResponseLanguage } from '@/ai-backend/ai/types';

export type ThemePreference = 'light' | 'dark' | 'system';
export type InterfaceLanguage = 'en' | 'vi';
export const PREFERENCES_KEY = 'aiHelperPreferences';

interface Preferences {
  theme: ThemePreference;
  language: InterfaceLanguage;
  responseLanguage: ResponseLanguage;
}

interface PreferencesState extends Preferences {
  hasHydrated: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  update: (values: Partial<Preferences>) => Promise<void>;
}

let saving: Promise<void> = Promise.resolve();

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  theme: 'system',
  language: 'en',
  responseLanguage: 'en',
  hasHydrated: false,
  error: null,
  initialize: async () => {
    try {
      const stored = (await chrome.storage.local.get(PREFERENCES_KEY))[PREFERENCES_KEY] as Partial<Preferences> | undefined;
      set({
        theme: stored?.theme === 'light' || stored?.theme === 'dark' ? stored.theme : 'system',
        language: stored?.language === 'vi' ? 'vi' : 'en',
        // Older installations start with their existing UI language, then stay independent.
        responseLanguage: stored?.responseLanguage === 'vi' || stored?.responseLanguage === 'en'
          ? stored.responseLanguage : stored?.language === 'vi' ? 'vi' : 'en',
        hasHydrated: true,
        error: null,
      });
    } catch {
      set({ hasHydrated: true, error: 'Could not load preferences. Please try again.' });
    }
  },
  update: async (values) => {
    set({ ...values, error: null });
    const { theme, language, responseLanguage } = get();
    saving = saving.catch(() => undefined).then(() =>
      chrome.storage.local.set({ [PREFERENCES_KEY]: { theme, language, responseLanguage } }),
    );
    try {
      await saving;
    } catch {
      set({ error: 'Could not save preferences. Please try again.' });
    }
  },
}));
