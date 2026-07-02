import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const ShareIcon = () => (
  <svg className="inline h-4 w-4 mx-0.5 align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const CloseButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="text-green-200 hover:text-white transition-colors p-1 shrink-0"
  >
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  </button>
);

const InstallBanner = () => {
  const { t } = useTranslation('common');
  const { canInstall, isIOS, isDesktopSafari, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div
      data-testid="install-banner"
      className="fixed bottom-0 left-0 right-0 z-50 bg-green-700 text-white shadow-lg"
    >
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 px-4 py-3">

        {isIOS ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">⛳</span>
              <p className="text-sm leading-snug">
                {t('installBanner.iosHint.prefix')}
                <ShareIcon />
                {t('installBanner.iosHint.suffix')}
              </p>
            </div>
            <CloseButton onClick={dismiss} label={t('installBanner.dismiss')} />
          </>
        ) : isDesktopSafari ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">⛳</span>
              <p className="text-sm leading-snug">
                {t('installBanner.safariHint', 'Instala la app: Archivo → Añadir al Dock…')}
              </p>
            </div>
            <CloseButton onClick={dismiss} label={t('installBanner.dismiss')} />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">⛳</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{t('installBanner.title')}</p>
                <p className="text-xs text-green-200 leading-tight hidden sm:block">
                  {t('installBanner.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={install}
                className="bg-white text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-green-50 transition-colors"
              >
                {t('installBanner.install')}
              </button>
              <CloseButton onClick={dismiss} label={t('installBanner.dismiss')} />
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default InstallBanner;
