import { usePreferencesStore, type InterfaceLanguage, type ThemePreference } from '@/identity/stores/preferencesStore';
import type { ResponseLanguage } from '@/ai-backend/ai';
import { useI18n } from '../../utils/i18n';

export function PreferencesControls() {
  const { t } = useI18n();
  const { theme, language, responseLanguage, hasHydrated, error, update } = usePreferencesStore();
  return (
    <section className="preferences-card my-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-slate-600">
          {t('Appearance')}
          <select id="appearance-theme" className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-800"
            value={theme} disabled={!hasHydrated} onChange={(event) => void update({ theme: event.target.value as ThemePreference })}>
            <option value="light">{t('Light')}</option>
            <option value="dark">{t('Dark')}</option>
            <option value="system">{t('System')}</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          {t('Interface language')}
          <select id="interface-language" className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-800"
            value={language} disabled={!hasHydrated} onChange={(event) => void update({ language: event.target.value as InterfaceLanguage })}>
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block text-xs font-medium text-slate-600">
        {t('Response language')}
        <select id="response-language" aria-describedby="response-language-help"
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-800"
          value={responseLanguage} disabled={!hasHydrated}
          onChange={(event) => void update({ responseLanguage: event.target.value as ResponseLanguage })}>
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select>
      </label>
      <p className="mt-1.5 text-[11px] leading-4 text-slate-500" id="response-language-help">
        {t('Saved automatically. Applies to new replies; translation uses its own target language.')}
      </p>
      {error ? <p role="alert" className="mt-2 text-xs text-red-700">{t(error)}</p> : null}
    </section>
  );
}
