import { PreferencesControls } from './PreferencesControls';
import { ModelSelect } from './ModelSelect';
import { useI18n } from '../../utils/i18n';
import { useEffect, useState, type FormEvent } from 'react';

import { PROVIDERS, getProvider, type ProviderId } from '@/ai-backend/ai';
import { useSettingsStore } from '@/identity';
import { useUiStore } from '../../stores/uiStore';
import { VaultReset } from './VaultReset';

export function SettingsPanel() {
  const { t } = useI18n();
  const [apiKey, setApiKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [replaceKey, setReplaceKey] = useState(false);
  const provider = useSettingsStore((state) => state.provider);
  const providerModels = useSettingsStore((state) => state.providerModels);
  const setProvider = useSettingsStore((state) => state.setProvider);
  const isSettingsOpen = useUiStore((state) => state.isSettingsOpen);
  const closeSettings = useUiStore((state) => state.closeSettings);
  const model = useSettingsStore((state) => state.model);
  const vaultStatus = useSettingsStore((state) => state.vaultStatus);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const isTesting = useSettingsStore((state) => state.isTesting);
  const requestActive = useSettingsStore((state) => state.requestActive);
  const lockPending = useSettingsStore((state) => state.lockPending);
  const error = useSettingsStore((state) => state.error);
  const success = useSettingsStore((state) => state.success);
  const setModel = useSettingsStore((state) => state.setModel);
  const saveCredentials = useSettingsStore((state) => state.saveCredentials);
  const unlock = useSettingsStore((state) => state.unlock);
  const saveModel = useSettingsStore((state) => state.saveModel);
  const testDraftConnection = useSettingsStore((state) => state.testDraftConnection);
  const testSavedConnection = useSettingsStore((state) => state.testSavedConnection);
  const lock = useSettingsStore((state) => state.lock);
  const clearNotice = useSettingsStore((state) => state.clearNotice);

  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setApiKey('');
        setPassphrase('');
        setShowSecrets(false);
        clearNotice();
        closeSettings();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [clearNotice, closeSettings, isSettingsOpen]);

  useEffect(() => {
    setApiKey('');
    setPassphrase('');
    setShowSecrets(false);
    setReplaceKey(false);
  }, [provider, isSettingsOpen]);

  if (!isSettingsOpen) {
    return null;
  }

  const isMissing = vaultStatus === 'missing';
  const isLocked = vaultStatus === 'locked';
  const isUnlocked = vaultStatus === 'unlocked';
  const isBusy = isSaving || isTesting || requestActive || lockPending;
  const needsCredentials = isMissing || (isUnlocked && (!providerModels[provider] || replaceKey));

  const handleClose = () => {
    setApiKey('');
    setPassphrase('');
    setShowSecrets(false);
    clearNotice();
    closeSettings();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (needsCredentials) {
      const saved = await saveCredentials(apiKey, passphrase);
      if (saved) {
        setApiKey('');
        setPassphrase('');
        setReplaceKey(false);
      }
      return;
    }
    if (isLocked) {
      const unlocked = await unlock(passphrase);
      if (unlocked) {
        setPassphrase('');
      }
      return;
    }
    await saveModel();
  };

  const handleTest = () => {
    if (needsCredentials) {
      void testDraftConnection(apiKey);
    } else if (isUnlocked) {
      void testSavedConnection();
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex justify-end bg-slate-950/25" role="presentation">
      <button
        aria-label={t("Close settings")}
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
        type="button"
      />
      <aside
        aria-labelledby="settings-title"
        aria-modal="true"
        className="settings-drawer relative z-10 h-full w-[min(92%,360px)] overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl"
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold" id="settings-title">{t("Settings")}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t("Three-provider BYOK")}</p>
          </div>
          <button
            aria-label={t("Close settings")}
            className="grid size-8 place-items-center rounded-lg text-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
            onClick={handleClose}
            type="button"
          >
            ×
          </button>
        </div>

        <PreferencesControls />
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-xs font-medium text-slate-700">{t("Provider")}<select
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              disabled={isLocked || isBusy || vaultStatus === 'error'}
              id="settings-provider"
              onChange={(event) => setProvider(event.target.value as ProviderId)}
              value={provider}
            >
              {PROVIDERS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>

          <ModelSelect
            disabled={isLocked || isBusy || vaultStatus === 'error'}
            id="settings-model"
            model={model}
            onChange={setModel}
            provider={provider}
          />

          {needsCredentials ? (
            <label className="block text-xs font-medium text-slate-700">
              {getProvider(provider).label} API Key
              <input
                autoComplete="off"
                id="settings-api-key"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={t("API key for selected provider")}
                type={showSecrets ? 'text' : 'password'}
                value={apiKey}
              />
            </label>
          ) : null}

          {needsCredentials || isLocked ? (
            <label className="block text-xs font-medium text-slate-700">{t("Vault passphrase")}<input
                autoComplete={isMissing ? 'new-password' : 'current-password'}
                id="settings-vault-passphrase"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                minLength={12}
                onChange={(event) => setPassphrase(event.target.value)}
                placeholder={t(isMissing ? 'At least 12 characters' : 'Existing vault passphrase')}
                type={showSecrets ? 'text' : 'password'}
                value={passphrase}
              />
            </label>
          ) : null}

          {needsCredentials || isLocked ? (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                checked={showSecrets}
                className="size-4 rounded border-slate-300"
                onChange={(event) => setShowSecrets(event.target.checked)}
                type="checkbox"
              />{t("Show sensitive values")}</label>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700" role="alert">
              {error ? t(error) : null}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700" role="status">
              {success ? t(success) : null}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy || isLocked || vaultStatus === 'error' || (needsCredentials && apiKey.trim().length === 0)}
              onClick={handleTest}
              type="button"
            >
              {isTesting ? t('Testing…') : t('Test Connection')}
            </button>
            <button
              className="h-10 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={
                isBusy ||
                (needsCredentials && (!apiKey.trim() || passphrase.length < 12)) || vaultStatus === 'error' ||
                (isLocked && passphrase.length < 1)
              }
              type="submit"
            >
              {isSaving
                ? t('Working…')
                : needsCredentials
                  ? t('Validate & Save')
                  : isLocked
                    ? t('Unlock')
                    : t('Save Provider & Model')}
            </button>
          </div>

          {isUnlocked && providerModels[provider] ? (
            <button
              className="h-10 w-full rounded-lg border border-slate-300 text-xs font-medium text-slate-600"
              disabled={isBusy}
              onClick={() => { setReplaceKey(!replaceKey); setApiKey(''); setPassphrase(''); clearNotice(); }}
              type="button"
            >
              {replaceKey ? t('Cancel key replacement') : t('Replace API key')}
            </button>
          ) : null}

          {needsCredentials && !isMissing ? (
            <p className="text-xs leading-5 text-slate-500">{t("Enter the existing vault passphrase to add or replace this provider's key. Other saved keys are kept.")}</p>
          ) : null}

          {isUnlocked ? (
            <button
              className="h-10 w-full rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50"
              onClick={lock}
              disabled={isSaving || isTesting || lockPending}
              type="button"
            >
              {lockPending ? t('Locking after response…') : t('Lock vault')}
            </button>
          ) : null}
        </form>
        <VaultReset />

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">{t("All API keys are encrypted with PBKDF2 and AES-GCM before they are stored in chrome.storage.local. The passphrase is never stored.")}</div>
      </aside>
    </div>
  );
}
