import { useI18n } from '../../utils/i18n';
interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const { t } = useI18n();
  return (
    <div
      className="notice-enter flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
      role="alert"
    >
      <p className="leading-5">{t(message)}</p>
      <button
        aria-label={t("Dismiss error")}
        className="shrink-0 rounded p-0.5 font-semibold hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-600"
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
