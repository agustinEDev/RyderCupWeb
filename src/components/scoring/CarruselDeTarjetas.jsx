import { useLayoutEffect, useRef, useState } from 'react';

const COLOR_DEL_NOMBRE = {
  A: 'border-l-blue-500 aria-selected:bg-blue-100 aria-selected:text-blue-700 aria-selected:border-blue-300',
  B: 'border-l-red-500 aria-selected:bg-red-100 aria-selected:text-red-700 aria-selected:border-red-300',
};

const sinMovimiento = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Tarjetas que se pasan deslizando, una por participante (FE #739).
 *
 * En el móvil la tarjeta horizontal no cabía y se desplazaba de lado dentro de
 * su caja. Aquí lo que se desliza es la tarjeta ENTERA, que encaja en su sitio
 * (`scroll-snap`): la página no se mueve de lado. Arriba, los nombres para
 * saltar a una; abajo, un punto por tarjeta que dice en cuál estás.
 *
 * El deslizamiento lo hace el navegador; aquí solo se lee a qué tarjeta se ha
 * llegado para marcarla, y se mueve el carril cuando se toca un nombre.
 *
 * @param {Array<{clave: string, nombre: string, equipo?: 'A'|'B', contenido: ReactNode}>} tarjetas
 * @param {string} [inicial] - La clave de la tarjeta con la que arranca
 */
const CarruselDeTarjetas = ({ tarjetas, inicial }) => {
  const carril = useRef(null);
  const [actual, setActual] = useState(() =>
    Math.max(0, tarjetas.findIndex((t) => t.clave === inicial))
  );

  // Arranca en la suya sin que se vea el viaje desde la primera
  useLayoutEffect(() => {
    const el = carril.current;
    if (el && actual > 0) el.scrollLeft = actual * el.clientWidth;
    // Solo al montar: después manda quien desliza
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ir = (indice) => {
    const destino = Math.min(Math.max(indice, 0), tarjetas.length - 1);
    setActual(destino);
    const el = carril.current;
    el?.scrollTo?.({ left: destino * el.clientWidth, behavior: sinMovimiento() ? 'auto' : 'smooth' });
  };

  const alDeslizar = () => {
    const el = carril.current;
    if (!el?.clientWidth) return;
    const llegada = Math.round(el.scrollLeft / el.clientWidth);
    if (llegada !== actual) setActual(llegada);
  };

  const alTeclear = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      ir(actual + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ir(actual - 1);
    }
  };

  const varias = tarjetas.length > 1;

  return (
    <div data-testid="carrusel-de-tarjetas" className="space-y-2">
      {varias && (
        <div role="tablist" className="flex flex-wrap gap-1.5">
          {tarjetas.map((tarjeta, i) => (
            <button
              key={tarjeta.clave}
              type="button"
              role="tab"
              aria-selected={i === actual}
              aria-controls={`tarjeta-${tarjeta.clave}`}
              onClick={() => ir(i)}
              className={`rounded-full border border-transparent bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 ${
                tarjeta.equipo ? `border-l-4 ${COLOR_DEL_NOMBRE[tarjeta.equipo]}` : 'aria-selected:bg-primary-100 aria-selected:text-primary-700'
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            >
              {tarjeta.nombre}
            </button>
          ))}
        </div>
      )}

      <div
        ref={carril}
        data-testid="carril-de-tarjetas"
        tabIndex={varias ? 0 : undefined}
        onScroll={alDeslizar}
        onKeyDown={varias ? alTeclear : undefined}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.clave}
            id={`tarjeta-${tarjeta.clave}`}
            role="tabpanel"
            aria-label={tarjeta.nombre}
            className="w-full flex-none snap-center"
          >
            {tarjeta.contenido}
          </div>
        ))}
      </div>

      {varias && (
        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {tarjetas.map((tarjeta, i) => (
            <span
              key={tarjeta.clave}
              data-testid={`punto-${tarjeta.clave}`}
              data-activo={String(i === actual)}
              className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${
                i === actual ? 'w-4 bg-primary' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CarruselDeTarjetas;
