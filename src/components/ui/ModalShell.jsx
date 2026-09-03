import { useEffect, useRef } from 'react';

/**
 * El armazón común de los diálogos: el fondo oscuro, la caja y todo lo que
 * hace que un modal se comporte como tal.
 *
 * Los tres diálogos de la pantalla de anotación —final anticipado, conceder y
 * entregar la tarjeta— eran el mismo `fixed inset-0` copiado tres veces, y
 * ninguno de los tres se cerraba con Escape, ni al pulsar fuera, ni se
 * anunciaba como diálogo: un lector de pantalla leía la página de debajo como
 * si nada la tapara, y con el teclado el foco seguía paseándose por los botones
 * del fondo.
 *
 * `ConfirmModal` resuelve por su cuenta el fondo, Escape y las etiquetas ARIA,
 * pero NO retiene ni devuelve el foco, que es justo lo que describe la #389.
 * Sigue sin migrar por su caja propia —otro relleno— y porque tiene su propio
 * bloqueo del desplazamiento: mientras conviva con este armazón, un diálogo de
 * cada clase abiertos a la vez pueden pisarse ese ajuste.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose Cerrar sin decidir: Escape y pulsar el fondo
 * @param {string} [props.testId] Va en el fondo, donde ya lo buscan los tests
 * @param {string} [props.labelledBy] id del título de la caja
 * @param {string} [props.describedBy] id del texto que explica el diálogo
 * @param {boolean} [props.closeOnEscape=true] En falso, Escape no cierra —una
 *   entrega en vuelo no se interrumpe a medias—, pero el diálogo sigue
 *   anunciándose y reteniendo el foco
 * @param {boolean} [props.closeOnBackdrop=true] En falso, pulsar el fondo no
 *   cierra. Va aparte de Escape a propósito: un diálogo con algo escrito dentro
 *   no puede perderlo por un toque al lado, y en un móvil el fondo es lo único
 *   que se toca sin querer
 * @param {boolean} [props.busy=false] Marca el diálogo como ocupado mientras
 *   algo está en vuelo: sin esto, un Escape que no cierra no dice por qué
 * @param {React.ReactNode} props.children
 */

const ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// El bloqueo del desplazamiento se cuenta entre TODOS los diálogos abiertos, no
// por diálogo. Guardándolo cada uno por su cuenta, el segundo en abrirse copiaba
// un `hidden` que ya no era del fondo, y al cerrarse el último lo devolvía: la
// página se quedaba sin poder desplazarse, sin ningún diálogo delante y hasta
// recargar. Pasa de verdad en la pantalla de anotación, donde la consulta cada
// 10 s puede montar el aviso de final anticipado encima del de entrega.
let dialogosAbiertos = 0;
let overflowDelFondo = null;

const ModalShell = ({
  isOpen,
  onClose,
  testId,
  labelledBy,
  describedBy,
  closeOnEscape = true,
  closeOnBackdrop = true,
  busy = false,
  children,
}) => {
  const cajaRef = useRef(null);
  const focoPrevioRef = useRef(null);
  const fondoPulsadoRef = useRef(false);

  // El foco entra en la caja al abrir y vuelve a donde estaba al cerrar. Sin lo
  // segundo, cerrar el diálogo dejaba el foco en el `body` y el siguiente
  // tabulador empezaba desde la cabecera de la página.
  useEffect(() => {
    if (!isOpen) return undefined;

    const caja = cajaRef.current;
    focoPrevioRef.current = document.activeElement;
    // Con `:not([disabled])`: enfocar un botón desactivado no hace nada y el
    // foco se quedaba detrás del diálogo, que es donde no puede estar.
    (caja?.querySelector(ENFOCABLES) ?? caja)?.focus();

    return () => {
      const anterior = focoPrevioRef.current;
      // Solo si el foco sigue siendo mío. Con dos diálogos encima, al cerrarse
      // el de abajo devolvía el foco a la página y se lo robaba al que quedaba
      // abierto delante.
      const esMio = caja?.contains(document.activeElement) || document.activeElement === document.body;
      if (esMio && typeof anterior?.focus === 'function' && document.contains(anterior)) {
        anterior.focus();
      }
    };
  }, [isOpen]);

  // La página de debajo no se arrastra mientras hay un diálogo delante.
  useEffect(() => {
    if (!isOpen) return undefined;

    if (dialogosAbiertos === 0) {
      overflowDelFondo = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    }
    dialogosAbiertos += 1;

    return () => {
      dialogosAbiertos -= 1;
      if (dialogosAbiertos === 0) {
        document.body.style.overflow = overflowDelFondo || '';
        overflowDelFondo = null;
      }
    };
  }, [isOpen]);

  // Escape cierra, y el tabulador da la vuelta dentro de la caja en vez de
  // salirse a lo que hay debajo (RyderCupWeb#389).
  useEffect(() => {
    if (!isOpen) return undefined;

    const alPulsar = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const caja = cajaRef.current;
      const enfocables = [...(caja?.querySelectorAll(ENFOCABLES) ?? [])];

      // Sin nada enfocable dentro no se deja salir: es justo lo que pasa
      // mientras la tarjeta va de camino, con los dos botones desactivados, y
      // es el momento en que el jugador NO puede acabar en la página de detrás.
      if (enfocables.length === 0) {
        e.preventDefault();
        caja?.focus();
        return;
      }

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const dentro = caja?.contains(document.activeElement);

      if (e.shiftKey && (document.activeElement === primero || !dentro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  // Cerrar pide que el gesto EMPIECE y acabe en el fondo. Seleccionando el texto
  // del mensaje con el ratón se suelta a menudo fuera de la caja, y ese soltar
  // llegaba aquí como un clic en el fondo: en el aviso de final anticipado eso
  // descartaba para toda la visita el único aviso que lleva a entregar.
  const alPulsarFondo = (e) => {
    fondoPulsadoRef.current = e.target === e.currentTarget;
  };

  const alSoltarFondo = (e) => {
    const empezoEnElFondo = fondoPulsadoRef.current;
    fondoPulsadoRef.current = false;
    if (closeOnBackdrop && empezoEnElFondo && e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      data-testid={testId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
      onMouseDown={alPulsarFondo}
      onClick={alSoltarFondo}
    >
      <div
        ref={cajaRef}
        tabIndex={-1}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        {children}
      </div>
    </div>
  );
};

export default ModalShell;
