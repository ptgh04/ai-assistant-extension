import { useI18n } from '../../utils/i18n';
import { useSettingsStore } from '@/identity';
import { getProvider } from '@/ai-backend/ai';
import { useUiStore } from '../../stores/uiStore';

export function VaultStatusBanner() {
  const { t } = useI18n();
  const vaultStatus = useSettingsStore((state) => state.vaultStatus);
  const provider = useSettingsStore((state) => state.provider);
  const providerModels = useSettingsStore((state) => state.providerModels);
  const openSettings = useUiStore((state) => state.openSettings);

  if (vaultStatus === 'loading' || (vaultStatus === 'unlocked' && providerModels[provider])) {
    return null;
  }

  const isMissing = vaultStatus === 'missing';

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      <p className="leading-4">
        {isMissing
          ? t('Add an API key to start chatting.')
          : vaultStatus === 'unlocked'
            ? t('Missing provider key', { provider: getProvider(provider).label })
            : t('Your encrypted API keys are locked.')}
      </p>
      <button
        className="shrink-0 rounded-lg bg-amber-900 px-2.5 py-1.5 font-medium text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900"
        onClick={openSettings}
        type="button"
      >
        {isMissing || vaultStatus === 'unlocked' ? t('Set up') : t('Unlock')}
      </button>
    </div>
  );
}
