import { useI18n } from '../../utils/i18n';
import { useState } from 'react';
import { useSettingsStore } from '@/identity';

export function VaultReset() {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const reset = useSettingsStore((state) => state.reset);
  const busy = useSettingsStore((state) => state.isSaving || state.isTesting || state.requestActive);
  if (!confirming) return (
    <button type="button" disabled={busy} onClick={() => setConfirming(true)} className="mt-4 text-xs text-red-700 underline disabled:opacity-50">{t("Reset vault / replace API key")}</button>
  );
  return (
    <section className="mt-4 rounded-xl border border-red-200 p-3 text-xs">
      <p>{t("Remove all saved provider keys from this extension and run setup again. Your conversations remain. This does not revoke keys at their providers.")}</p>
      <label className="mt-3 block">{t("Type RESET to confirm")}<input aria-label={t("Reset confirmation")} value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-2" />
      </label>
      <div className="mt-3 flex gap-3">
        <button type="button" disabled={busy || confirmation !== 'RESET'} onClick={() => void reset(confirmation)} className="rounded bg-red-700 px-3 py-2 text-white disabled:opacity-40">{t("Reset vault")}</button>
        <button type="button" disabled={busy} onClick={() => { setConfirmation(''); setConfirming(false); }}>{t("Cancel")}</button>
      </div>
    </section>
  );
}
