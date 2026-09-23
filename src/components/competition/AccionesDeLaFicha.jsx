import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * Las acciones de la ficha de competición (FE #705).
 *
 * Había hasta siete botones del mismo peso en seis colores —verde, naranja,
 * azul, rojo, morado y gris—, envueltos en dos filas: todos gritaban igual de
 * fuerte, así que ninguno destacaba y el que de verdad tocaba en ese momento
 * se perdía entre los demás.
 *
 * Aquí se ofrece **una** acción, la del momento, y el resto vive en un menú.
 * Quién es «la del momento» lo decide `siguientePasoDeLaCompeticion`, para que
 * esa regla se pueda probar como la tabla de estados que es.
 *
 * El menú se escribe a mano: no hay librería de menús en el proyecto y traer
 * una para esto engordaría el paquete, que tiene presupuesto en el CI.
 *
 * @param {Object} props
 * @param {{id: string, label: string, onClick: Function, icon?: Function}|null} props.principal
 * @param {Array} props.acciones - Las de gestionar, dentro del menú
 * @param {Array} props.destructivas - Las que no tienen vuelta atrás
 * @param {Function} props.t
 */
const AccionesDeLaFicha = ({ principal, acciones = [], destructivas = [], t }) => {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);
  const disparador = useRef(null);
  const idDelMenu = useId();

  // Al cerrarlo desde dentro —Escape o una acción— el foco vuelve al botón:
  // si no, quien va con teclado se queda sin sitio en la página. Al pulsar
  // fuera no, porque ahí el foco ya está donde se ha pulsado
  const cerrarYVolver = () => {
    setAbierto(false);
    disparador.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return undefined;

    const alPulsarFuera = (evento) => {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false);
    };
    const alEscapar = (evento) => {
      if (evento.key === 'Escape') cerrarYVolver();
    };

    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alEscapar);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alEscapar);
    };
  }, [abierto]);

  const hayMenu = acciones.length > 0 || destructivas.length > 0;
  if (!principal && !hayMenu) return null;

  const elegir = (accion) => {
    cerrarYVolver();
    accion.onClick();
  };

  const filaDelMenu = (accion, destructiva) => {
    const Icono = accion.icon;
    return (
      <button
        key={accion.id}
        type="button"
        role="menuitem"
        data-testid={`accion-${accion.id}`}
        onClick={() => elegir(accion)}
        disabled={accion.disabled}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50 ${
          destructiva ? 'text-red-700' : 'text-gray-700'
        }`}
      >
        {Icono && <Icono className="h-4 w-4 shrink-0" />}
        <span>{accion.label}</span>
      </button>
    );
  };

  const IconoPrincipal = principal?.icon;

  return (
    <div ref={contenedor} className="flex items-center gap-2">
      {principal && (
        <button
          type="button"
          data-testid="accion-principal"
          onClick={principal.onClick}
          disabled={principal.disabled}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
        >
          {IconoPrincipal && <IconoPrincipal className="h-4 w-4" />}
          <span>{principal.label}</span>
        </button>
      )}

      {hayMenu && (
        <div className="relative">
          <button
            ref={disparador}
            type="button"
            data-testid="menu-acciones"
            onClick={() => setAbierto((estaba) => !estaba)}
            aria-haspopup="menu"
            aria-expanded={abierto}
            aria-controls={abierto ? idDelMenu : undefined}
            aria-label={t('detail.actions.more')}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {abierto && (
            <div
              id={idDelMenu}
              role="menu"
              className="absolute right-0 z-20 mt-1 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            >
              {acciones.map((accion) => filaDelMenu(accion, false))}
              {destructivas.length > 0 && acciones.length > 0 && (
                <div data-testid="separador-destructivas" className="my-1 border-t border-gray-200" />
              )}
              {destructivas.map((accion) => filaDelMenu(accion, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccionesDeLaFicha;
