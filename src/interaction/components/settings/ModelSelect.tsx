import { getProvider, type ProviderId } from '@/ai-backend/ai';
import { useI18n } from '../../utils/i18n';

interface ModelSelectProps {
  id: string;
  provider: ProviderId;
  model: string;
  disabled?: boolean;
  onChange: (model: string) => void;
}

export function ModelSelect({ id, provider, model, disabled, onChange }: ModelSelectProps) {
  const { t } = useI18n();
  const models = getProvider(provider).models;
  const hasSelectedModel = models.some((option) => option.id === model);

  return (
    <div>
      <label className="block text-xs font-medium text-slate-700" htmlFor={id}>
        {t('Model')}
      </label>
      <select
        aria-describedby={`${id}-help`}
        className="mt-1.5 h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        title={model}
        value={model}
      >
        {!hasSelectedModel && model ? (
          <option value={model}>{model} ({t('Saved model')})</option>
        ) : null}
        {models.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
      <p className="mt-1.5 text-[11px] leading-4 text-slate-500" id={`${id}-help`}>
        {t('Model access depends on your API key and account.')}
      </p>
    </div>
  );
}
