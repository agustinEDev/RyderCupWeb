import { useState } from 'react';
import { cargarBarras } from '../composition/cargarBarras';
import { useCargaCancelableEffect } from './useCargaCancelableEffect';

/**
 * Las barras de una inscripción, campo a campo (barras por campo): solo se
 * piden mientras hacen falta (`activa`), y lo que llega de otra inscripción
 * no se usa. `recargar()` las vuelve a leer tras un cambio: la pantalla
 * enseña lo que dice el servidor.
 *
 * @param {string|null|undefined} enrollmentId
 * @param {boolean} activa
 * @param {number} [version=0] - Al cambiar, se vuelven a leer: la ficha la
 *   sube cuando cualquier barra cambia (la pregunta de pendientes, las de los
 *   campos, el modal de un jugador)
 * @returns {{ barras: Object|null, cargando: boolean, fallo: boolean, recargar: () => Promise<Object> }}
 */
export const useBarrasDeLaInscripcion = (enrollmentId, activa, version = 0) => {
  const [leidas, setLeidas] = useState({
    de: null,
    barras: null,
    fallo: false,
  });
  const { cargando, recargar } = useCargaCancelableEffect(
    () =>
      cargarBarras().then((casos) =>
        casos.getEnrollmentTeesUseCase.execute(enrollmentId),
      ),
    [enrollmentId, version],
    {
      activa: Boolean(activa && enrollmentId),
      alCargar: (barras) =>
        setLeidas({ de: enrollmentId, barras, fallo: false }),
      alFallar: () =>
        setLeidas({ de: enrollmentId, barras: null, fallo: true }),
    },
  );
  const deEsta = leidas.de === enrollmentId;
  return {
    barras: deEsta ? leidas.barras : null,
    cargando,
    fallo: deEsta && leidas.fallo && !cargando,
    recargar,
  };
};
