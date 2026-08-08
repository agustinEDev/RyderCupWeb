import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import InstallInstructionsModal from './InstallInstructionsModal';

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

/**
 * @param {boolean} aboveBottomNav - Sube el banner por encima de la navegación
 *   inferior en móvil para que no se solapen (FE #306)
 */
const InstallBanner = ({ aboveBottomNav = false }) => {
  const { t } = useTranslation('common');
  const { canInstall, isIOS, iosInstallRoute, isDesktopSafari, install, dismiss } = useInstallPrompt();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!canInstall) return null;

  // Con nav inferior el banner no puede apoyarse en el borde: la nav ya ocupa
  // ese espacio (y su propio safe-area), así que se apila justo encima. Los
  // 5rem no son la altura de la barra (55 px) sino la del botón de partida
  // rápida, que sobresale por encima y llega a 71 px del borde inferior
  const positionClasses = aboveBottomNav
    ? 'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-0 pb-0 md:pb-[env(safe-area-inset-bottom)]'
    : 'bottom-0 pb-[env(safe-area-inset-bottom)]';

  return (
    <>
    <InstallInstructionsModal
      isOpen={showInstructions}
      route={isDesktopSafari ? 'desktop-safari' : iosInstallRoute}
      onClose={() => setShowInstructions(false)}
    />
    <div
      data-testid="install-banner"
      className={`fixed left-0 right-0 z-50 bg-green-700 text-white shadow-lg ${positionClasses}`}
    >
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 px-4 py-3">

        {isIOS ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">⛳</span>
              {/* Sin el icono no se sabe qué buscar, y sin decir dónde está no
                  se sabe dónde mirar: en Safari la barra de compartir está
                  abajo en iPhone y arriba en iPad. Los demás navegadores de iOS
                  llegan por su propio menú, así que a ellos no se les promete
                  ninguna posición (FE #332) */}
              <div className="min-w-0">
                {iosInstallRoute === 'other-browser' ? (
                  <p className="text-sm leading-snug">
                    {t('installBanner.iosHint.otherBrowser')}
                  </p>
                ) : iosInstallRoute === 'safari-ipad' ? (
                  <p className="text-sm leading-snug">
                    {t('installBanner.iosHint.prefix')}
                    <ShareIcon />
                    {t('installBanner.iosHint.inTopBar')}
                    {t('installBanner.iosHint.suffix')}
                  </p>
                ) : (
                  // En el iPhone el camino real son cuatro pasos y Compartir
                  // vive dentro del menu ···, no en la barra: una linea no
                  // puede resumirlo sin mentir, asi que remite a la guia
                  <p className="text-sm leading-snug">
                    {t('installBanner.iosHint.iphone')}
                  </p>
                )}
                {/* Una linea no basta para cuatro pasos manuales: quien lo
                    necesite puede pedir la guia completa (FE #335) */}
                <button
                  type="button"
                  onClick={() => setShowInstructions(true)}
                  className="mt-1 min-h-[32px] text-sm font-semibold text-green-200 underline underline-offset-2 transition-colors hover:text-white"
                >
                  {t('installModal.howTo')}
                </button>
              </div>
            </div>
            <CloseButton onClick={dismiss} label={t('installBanner.dismiss')} />
          </>
        ) : isDesktopSafari ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">⛳</span>
              <div className="min-w-0">
                <p className="text-sm leading-snug">
                  {t('installBanner.safariHint', 'Instala la app: Archivo → Añadir al Dock…')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowInstructions(true)}
                  className="mt-1 min-h-[32px] text-sm font-semibold text-green-200 underline underline-offset-2 transition-colors hover:text-white"
                >
                  {t('installModal.howTo')}
                </button>
              </div>
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
    </>
  );
};

export default InstallBanner;
