import { useEffect } from 'react';
import { usePreferencesStore } from '@/identity/stores/preferencesStore';

export function useAppearance(): void {
  const theme = usePreferencesStore((state) => state.theme);
  const language = usePreferencesStore((state) => state.language);
  const initialize = usePreferencesStore((state) => state.initialize);
  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      document.documentElement.lang = language;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, language]);
}
