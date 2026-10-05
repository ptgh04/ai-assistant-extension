import { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../utils/i18n';

export function NetworkBanner() {
  const { t } = useI18n();
  const online = useUiStore((state) => state.online);
  const setOnline = useUiStore((state) => state.setOnline);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setOnline(navigator.onLine);
    const offline = () => { setOnline(false); setRestored(false); clearTimeout(timer); };
    const reconnect = () => {
      setOnline(true); setRestored(true);
      clearTimeout(timer);
      timer = setTimeout(() => setRestored(false), 4000);
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', reconnect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', reconnect);
    };
  }, [setOnline]);
  if (online && !restored) return null;
  return (
    <div role={online ? 'status' : 'alert'} className={`network-banner shrink-0 px-4 py-2.5 text-xs ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-900'}`}>
      <p className="flex items-center gap-2 font-semibold"><span aria-hidden="true">{online ? '✓' : '◉'}</span>{t(online ? 'Connection restored' : 'Offline title')}</p>
      {!online ? <p className="mt-1 leading-5">{t('Offline description')}</p> : null}
    </div>
  );
}
