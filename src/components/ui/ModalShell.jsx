import { useEffect, useRef } from 'react';
import { useFocoRetenido } from '../../hooks/useFocoRetenido';

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
 * @param {boolean} [props.scrollableBackdrop=false] Para un diálogo ALTO: el
 *   fondo se desplaza y la caja se alinea arriba en vez de al centro. Centrada
 *   y con el fondo sin desplazamiento, una caja más alta que la ventana se
 *   recorta por LOS DOS extremos —se pierden el título y los botones— y no hay
 *   forma de alcanzarlos. Pasa en un móvil apaisado, donde caben ~390 px de
 *   alto. Va como opción y no por defecto porque los diálogos cortos, que son
 *   todos los demás, se ven mejor centrados
 * @param {string} [props.maxWidthClass='max-w-md'] Ancho máximo de la caja. El
 *   valor por defecto es el de siempre, así que ningún diálogo cambia; lo pasa
 *   quien enseña algo que no cabe en una columna estrecha, como la tarjeta de
 *   18 hoyos del detalle de un campo
 * @param {boolean} [props.hojaInferior=false] En el móvil, la caja va pegada
 *   abajo, como una hoja que sube; en el ordenador, al centro como siempre. Para
 *   las fichas de las filas del panel de admin (17 oct 2026). Con
 *   `scrollableBackdrop` a la vez, manda este último
 * @param {string} [props.boxClassName] La caja entera, en vez de la de siempre.
 *   Para los modales que traen la suya —con cabecera de borde, animada o sin
 *   relleno— y pasaron a este armazón sin cambiar de aspecto (4 oct 2026). Si se
 *   pasa, `maxWidthClass` no se usa
 * @param {React.RefObject<HTMLElement>} [props.inicialRef] Dónde entra el foco
 *   al abrir, si no es en lo primero: el campo de un buscador y no la X de la
 *   cabecera (AddFriendModal, 21 oct 2026)
 * @param {React.ReactNode} props.children
 */

// La caja para un modal que trae la suya dentro: solo la coloca, sin fondo,
// borde ni relleno, para que se vea como antes de pasar a este armazón
export const CAJA_PROPIA = 'w-full mx-4 flex justify-center';

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
  maxWidthClass = 'max-w-md',
  scrollableBackdrop = false,
  hojaInferior = false,
  boxClassName,
  inicialRef,
  children,
}) => {
  const cajaRef = useRef(null);
  const fondoPulsadoRef = useRef(false);

  // El foco entra, no se sale y vuelve; y Escape cierra (#389). Vive en el hook
  // para que lo compartan las hojas inferiores
  useFocoRetenido(cajaRef, {
    activo: isOpen,
    inicialRef,
    alEscape: () => {
      if (closeOnEscape) onClose?.();
    },
  });

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
      className={`fixed inset-0 z-50 flex justify-center bg-black/50 ${
        scrollableBackdrop ? 'items-start overflow-y-auto py-8' : hojaInferior ? 'items-end md:items-center' : 'items-center'
      }`}
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
        className={boxClassName ?? `bg-white rounded-lg shadow-xl ${maxWidthClass} w-full mx-4 p-6`}
      >
        {children}
      </div>
    </div>
  );
};

export default ModalShell;
