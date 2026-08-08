import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/**
 * Diagrama esquematico de un telefono con la barra del navegador y el boton de
 * compartir resaltado (FE #335).
 *
 * Es un dibujo, no una captura: la CSP prohibe recursos externos, y una captura
 * de Safari envejeceria con cada version de iOS y habria que mantener una por
 * idioma. Lo unico que tiene que comunicar es donde mirar.
 */
const PhoneDiagram = ({ barPosition }) => {
  const barY = barPosition === 'top' ? 26 : 116;

  return (
    <svg
      viewBox="0 0 96 152"
      className="h-36 w-auto"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="4" width="88" height="144" rx="12" className="fill-white stroke-gray-300" strokeWidth="2" />
      <rect x="10" y="34" width="76" height="76" rx="4" className="fill-gray-50" />

      {/* Barra del navegador */}
      <rect x="10" y={barY} width="76" height="20" rx="6" className="fill-gray-100 stroke-gray-200" strokeWidth="1" />

      {/* Lo que se resalta esta a la derecha de la barra en ambos casos: en el
          iPhone es el boton ···, que abre el menu donde vive Compartir; en el
          iPad, el propio boton de compartir */}
      <circle cx="72" cy={barY + 10} r="11" className="fill-primary-100" />
      <circle cx="72" cy={barY + 10} r="11" className="fill-none stroke-primary-500" strokeWidth="1.5" />

      {barPosition === 'bottom' ? (
        // Tres puntos: el boton de mas opciones
        [66, 72, 78].map((cx) => (
          <circle key={cx} cx={cx} cy={barY + 10} r="1.6" className="fill-primary-500" />
        ))
      ) : (
        // Icono de compartir, el mismo trazo que en la banda
        <g transform={`translate(66, ${barY + 4})`} className="stroke-primary-500" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6v5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6" />
          <polyline points="8 3 6 1 4 3" />
          <line x1="6" y1="1" x2="6" y2="8" />
        </g>
      )}

      {/* Direccion, a la izquierda de la barra */}
      <rect x="18" y={barY + 7} width="34" height="6" rx="3" className="fill-gray-300" />
    </svg>
  );
};

/**
 * Pasos por ruta de instalacion. El orden es el orden en pantalla.
 *
 * La secuencia de iPhone esta verificada contra capturas de un iOS 26 real: el
 * boton Compartir no vive en la barra sino dentro del menu ···, y la hoja de
 * compartir no muestra "Anadir a pantalla de inicio" hasta desplegar "Ver mas"
 * — que es justo donde se atasca cualquiera.
 *
 * La de iPad sigue sin comprobar en un aparato.
 */
const STEPS = {
  'safari-iphone': ['moreButton', 'shareInMenu', 'findAddToHome', 'confirmAdd'],
  'safari-ipad': ['shareTop', 'findAddToHome', 'confirmAdd'],
  'other-browser': ['openMenu', 'chooseAdd'],
  'desktop-safari': ['openFileMenu', 'chooseDock'],
};

/**
 * Guia paso a paso para instalar donde el navegador no ofrece instalacion
 * programatica (FE #335).
 *
 * En iOS no existe ninguna API de instalacion, asi que estos pasos son la
 * funcionalidad, no un texto de apoyo: quien no los siga no instala la
 * aplicacion.
 *
 * @param {boolean} isOpen
 * @param {'safari-iphone'|'safari-ipad'|'other-browser'|'desktop-safari'} route
 * @param {Function} onClose
 */
const InstallInstructionsModal = ({ isOpen, route, onClose }) => {
  const { t } = useTranslation('common');
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const prevOverflowRef = useRef(null);

  // Bloquear el scroll del fondo mientras el modal esta abierto
  useEffect(() => {
    if (!isOpen) return;

    prevOverflowRef.current = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflowRef.current || '';
    };
  }, [isOpen]);

  // Devolver el foco a quien abrio el modal: sin esto el teclado vuelve al
  // principio del documento al cerrar
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  // Escape para cerrar y tabulador atrapado dentro del dialogo
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = dialogRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = STEPS[route] ?? STEPS['other-browser'];
  // Solo se dibuja el telefono cuando se puede senalar un sitio concreto: en un
  // navegador ajeno, dibujar la barra de Safari mandaria a buscar donde no esta
  const barPosition = route === 'safari-iphone' ? 'bottom' : route === 'safari-ipad' ? 'top' : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="install-instructions-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
        // Cuatro pasos mas el diagrama no caben en una pantalla baja (un movil
        // en horizontal), y como el fondo esta bloqueado se perderian los
        // ultimos pasos y el boton. `dvh` porque en movil la altura util cambia
        // al aparecer y desaparecer las barras del navegador
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <h2 id="install-modal-title" className="text-lg font-bold text-gray-900 font-poppins">
            {t('installModal.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('installModal.close')}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {barPosition && (
          <div className="flex justify-center pt-4">
            <PhoneDiagram barPosition={barPosition} />
          </div>
        )}

        <ol className="space-y-3 px-5 py-5">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="text-sm leading-snug text-gray-700">
                {t(`installModal.steps.${step}`)}
              </span>
            </li>
          ))}
        </ol>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition-colors hover:bg-primary-600"
          >
            {t('installModal.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallInstructionsModal;
