import { PreferencesControls } from '../settings/PreferencesControls';
import { ModelSelect } from '../settings/ModelSelect';
import { useI18n } from '../../utils/i18n';
import { useEffect, useState, type FormEvent } from 'react';

import { PROVIDERS, getProvider, type ProviderId } from '@/ai-backend/ai';
import { useSettingsStore } from '@/identity';

const TOTAL_STEPS = 4;

export function SetupWizard() {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [passphrase, setPassphrase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const provider = useSettingsStore((state) => state.provider);
  const setProvider = useSettingsStore((state) => state.setProvider);
  const model = useSettingsStore((state) => state.model);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const error = useSettingsStore((state) => state.error);
  const setModel = useSettingsStore((state) => state.setModel);
  const saveCredentials = useSettingsStore((state) => state.saveCredentials);
  const clearNotice = useSettingsStore((state) => state.clearNotice);

  useEffect(() => {
    clearNotice();
    let mounted = true;
    void chrome.storage.local.get('aiHelperSetupStep').then((stored) => {
      if (mounted && [1, 2, 3, 4].includes(stored.aiHelperSetupStep)) setStep(stored.aiHelperSetupStep);
    }).catch(() => { if (mounted) setProgressError('Setup progress could not be restored.'); });
    return () => { mounted = false; };
  }, [clearNotice]);

  const moveTo = (value: number) => {
    setStep(value);
    void chrome.storage.local.set({ aiHelperSetupStep: value }).catch(() => setProgressError('Setup progress could not be saved.'));
  };

  const nextStep = () => {
    clearNotice();
    moveTo(Math.min(step + 1, TOTAL_STEPS));
  };

  const previousStep = () => {
    clearNotice();
    moveTo(Math.max(step - 1, 1));
  };

  const finishSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passphrase.length < 12) { moveTo(1); return; }
    if (apiKey.trim().length < 20) { moveTo(3); return; }
    if (await saveCredentials(apiKey, passphrase)) {
      setApiKey(''); setPassphrase('');
      void chrome.storage.local.remove('aiHelperSetupStep').catch(() => undefined);
    }
  };

  return (
    <main className="flex h-screen min-h-[420px] flex-col overflow-y-auto bg-slate-50 px-5 py-6 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-6">
          <div className="grid size-12 place-items-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200">
            AI
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">{t("Set up AI Helper")}</h1>
          <p className="mt-1.5 text-sm leading-5 text-slate-500">{t("Your API keys stay encrypted on this device.")}</p>
        </div>

        <PreferencesControls />
        <ol aria-label={t("Setup progress")} className="mb-6 grid grid-cols-4 gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map(
            (item) => (
              <li
                aria-current={item === step ? 'step' : undefined}
                className={`h-1.5 rounded-full ${
                  item <= step ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                key={item}
              >
                <span className="sr-only">
                  {t('Step count', { step: item, total: TOTAL_STEPS })}
                </span>
              </li>
            ),
          )}
        </ol>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {progressError ? <p role="alert" className="text-xs text-red-700">{t(progressError)}</p> : null}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
            {t('Step count', { step, total: TOTAL_STEPS })}
          </p>

          {step === 1 ? (
            <div className="mt-3">
              <h2 className="text-base font-semibold">{t("Create your local vault")}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t("Choose a passphrase with at least 12 characters. It is never stored and cannot be recovered.")}</p>
              <label className="mt-4 block text-xs font-medium text-slate-700">{t("Vault passphrase")}<input
                  autoComplete="new-password"
                  autoFocus
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  minLength={12}
                  onChange={(event) => setPassphrase(event.target.value)}
                  placeholder={t("At least 12 characters")}
                  type={showSecrets ? 'text' : 'password'}
                  value={passphrase}
                />
              </label>
              <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <input
                  checked={showSecrets}
                  className="size-4 rounded border-slate-300"
                  onChange={(event) => setShowSecrets(event.target.checked)}
                  type="checkbox"
                />{t("Show passphrase")}</label>
              <button
                className="mt-5 h-10 w-full rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                disabled={passphrase.length < 12}
                onClick={nextStep}
                type="button"
              >{t("Continue")}</button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-3">
              <h2 className="text-base font-semibold">{t("Choose provider")}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t("Choose the provider you want to use. You can add other keys in Settings later.")}</p>
              <label className="mt-4 block text-xs font-medium text-slate-700">{t("Provider")}<select
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  value={provider}
                  id="setup-provider"
                  onChange={(event) => { setApiKey(''); setProvider(event.target.value as ProviderId); }}
                >
                  {PROVIDERS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <div className="mt-4">
                <ModelSelect
                  id="setup-model"
                  model={model}
                  onChange={setModel}
                  provider={provider}
                />
              </div>
              <WizardNavigation onBack={previousStep} onContinue={nextStep} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-3">
              <h2 className="text-base font-semibold">{t("Enter your API key")}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t("The key is validated before it is encrypted and saved.")}</p>
              <label className="mt-4 block text-xs font-medium text-slate-700">
                {getProvider(provider).label} API Key
                <input
                  autoComplete="off"
                  autoFocus
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={t("API key for selected provider")}
                  type={showSecrets ? 'text' : 'password'}
                  value={apiKey}
                />
              </label>
              <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <input
                  checked={showSecrets}
                  className="size-4 rounded border-slate-300"
                  onChange={(event) => setShowSecrets(event.target.checked)}
                  type="checkbox"
                />{t("Show sensitive values")}</label>
              <WizardNavigation
                continueDisabled={apiKey.trim().length < 20}
                onBack={previousStep}
                onContinue={nextStep}
              />
            </div>
          ) : null}

          {step === 4 ? (
            <form className="mt-3" onSubmit={finishSetup}>
              <h2 className="text-base font-semibold">{t("Validate and finish")}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t("AI Helper will test the connection, then encrypt the key with PBKDF2 and AES-GCM.")}</p>
              <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("Provider")}</dt>
                  <dd className="font-medium">{getProvider(provider).label}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("Model")}</dt>
                  <dd className="truncate font-medium">{model}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("API Key")}</dt>
                  <dd className="font-medium">
                    ••••••••{apiKey.trim().slice(-4)}
                  </dd>
                </div>
              </dl>
              {error ? (
                <p
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
                  role="alert"
                >
                  {error ? t(error) : null}
                </p>
              ) : null}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  className="h-10 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={isSaving}
                  onClick={previousStep}
                  type="button"
                >{t("Back")}</button>
                <button
                  className="h-10 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? t('Validating…') : t('Validate & Save')}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <p className="mt-4 text-center text-[11px] leading-4 text-slate-400">{t('Setup privacy')}</p>
      </div>
    </main>
  );
}

interface WizardNavigationProps {
  continueDisabled?: boolean;
  onBack: () => void;
  onContinue: () => void;
}

function WizardNavigation({
  continueDisabled = false,
  onBack,
  onContinue,
}: WizardNavigationProps) {
  const { t } = useI18n();
  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      <button
        className="h-10 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
        onClick={onBack}
        type="button"
      >{t("Back")}</button>
      <button
        className="h-10 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        disabled={continueDisabled}
        onClick={onContinue}
        type="button"
      >{t("Continue")}</button>
    </div>
  );
}
