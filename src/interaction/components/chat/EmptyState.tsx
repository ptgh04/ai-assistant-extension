import { useI18n } from '../../utils/i18n';
export function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="welcome-state m-auto flex max-w-xs flex-col items-center px-4 py-5 text-center">
      <div aria-hidden="true" className="welcome-mark mb-1 grid size-12 place-items-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-200">
        ✦
      </div>
      <h2 className="mt-4 text-sm font-semibold">{t("Start a conversation")}</h2>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{t('Ask a question, select text on a website, or use the page tools.')}</p>
      <p className="mt-3 text-[10px] leading-4 text-slate-400">{t('Messages and attached content are sent to your selected provider when you send a request.')}</p>
    </div>
  );
}
