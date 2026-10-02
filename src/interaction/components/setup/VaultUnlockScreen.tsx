import { PreferencesControls } from '../settings/PreferencesControls';
import { useI18n } from '../../utils/i18n';
import { useEffect, useState, type FormEvent } from 'react';

import { useSettingsStore } from '@/identity';
import { VaultReset } from '../settings/VaultReset';

export function VaultUnlockScreen() {
  const { t } = useI18n();
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const error = useSettingsStore((state) => state.error);
  const unlock = useSettingsStore((state) => state.unlock);
  const clearNotice = useSettingsStore((state) => state.clearNotice);

  useEffect(() => {
    clearNotice();
  }, [clearNotice]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const unlocked = await unlock(passphrase);
    if (unlocked) {
      setPassphrase('');
    }
  };

  return (
    <main className="grid h-screen min-h-[360px] place-items-center overflow-y-auto bg-slate-50 p-5 text-slate-900">
      <form
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-xl text-amber-800">
          🔒
        </div>
        <h1 className="mt-4 text-lg font-semibold">{t("Unlock AI Helper")}</h1>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t("Enter your local vault passphrase to decrypt the saved API key for this Side Panel session.")}</p>
        <label className="mt-4 block text-xs font-medium text-slate-700">{t("Vault passphrase")}<input
            autoComplete="current-password"
            autoFocus
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setPassphrase(event.target.value)}
            type={showPassphrase ? 'text' : 'password'}
            value={passphrase}
          />
        </label>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <input
            checked={showPassphrase}
            className="size-4 rounded border-slate-300"
            onChange={(event) => setShowPassphrase(event.target.checked)}
            type="checkbox"
          />{t("Show passphrase")}</label>
        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
            role="alert"
          >
            {error ? t(error) : null}
          </p>
        ) : null}
        <button
          className="mt-5 h-10 w-full rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
          disabled={!passphrase || isSaving}
          type="submit"
        >
          {t(isSaving ? 'Unlocking…' : 'Unlock vault')}
        </button>
        <PreferencesControls />
        <VaultReset />
      </form>
    </main>
  );
}
