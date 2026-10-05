import { useI18n } from '../../utils/i18n';
export function AppLoadingScreen() {
  const { t } = useI18n();
  return (
    <main
      aria-busy="true"
      aria-label={t("Loading AI Helper")}
      className="grid h-screen min-h-[320px] place-items-center bg-slate-50 text-slate-900"
    >
      <div className="text-center">
        <div className="mx-auto grid size-12 animate-pulse place-items-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
          AI
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("Loading AI Helper…")}</p>
      </div>
    </main>
  );
}
