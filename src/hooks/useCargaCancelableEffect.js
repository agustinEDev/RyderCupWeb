import { useEffect, useEffectEvent, useRef, useState } from 'react';

/**
 * Una carga que vive en su efecto (patrón de la documentación de React) y
 * descarta lo que llega tarde: al cambiar sus dependencias, al volver a pedirla,
 * al desactivarse o al desmontar, la respuesta anterior ya no se aplica, no
 * avisa de su fallo y no quita la espera de la actual.
 *
 * El nombre acaba en `Effect` a propósito: así `react-hooks/exhaustive-deps`
 * (con `additionalHooks` en eslint.config.js) la trata como un efecto: comprueba
 * que `deps` traiga todo lo que usa `pedir` y admite de más lo que solo sirve
 * para volver a pedir, como el usuario o el `t` de un cambio de idioma. Con otro
 * nombre esas daba por innecesarias. Por lo mismo, `pedir` no puede ser
 * `async`: devuelve la promesa.
 *
 * `alCargar` y `alFallar` se leen al llegar la respuesta, con los valores de
 * ese momento, y no son dependencias: un aviso que usa `t` no vuelve a pedir
 * nada al cambiar de idioma.
 *
 * @param {() => Promise<*>} pedir - Lo que se pide; se llama dentro del efecto.
 * @param {Array} deps - Cuándo se vuelve a pedir.
 * @param {Object} [opciones]
 * @param {boolean} [opciones.activa=true] - Inactiva no pide y no espera.
 * @param {(datos: *, carga: { silenciosa: boolean }) => void} [opciones.alCargar]
 * @param {(error: Error, carga: { silenciosa: boolean }) => void} [opciones.alFallar]
 * Límite conocido: un `recargar({ silenciosa: true })` que se lanza con la carga
 * inactiva, o en el mismo pintado en que cambian las dependencias, sale sin la
 * espera. Hoy nadie lo hace; si hiciera falta, comparar también las
 * dependencias para decidir si es silenciosa.
 *
 * @returns {{ cargando: boolean, recargar: (opciones?: { silenciosa?: boolean }) => void }}
 *   `recargar()` vuelve a pedir con la espera; `recargar({ silenciosa: true })`,
 *   sin ella.
 */
export const useCargaCancelableEffect = (pedir, deps, { activa = true, alCargar, alFallar } = {}) => {
  // Hasta que no termine una carga se espera: también antes de la primera, que
  // al activarse la espera ya está puesta
  const [enCurso, setEnCurso] = useState(true);
  // Cada `recargar()` es un objeto nuevo: es lo que vuelve a lanzar el efecto
  const [recarga, setRecarga] = useState({ silenciosa: false });
  // El último `recargar()` que ya lanzó su carga: si el efecto vuelve a correr
  // por otra cosa (cambian las dependencias), esa carga ya no es silenciosa
  const recargaConsumidaRef = useRef(null);

  const pedirAhora = useEffectEvent(() => pedir());
  const aplicar = useEffectEvent((datos, carga) => alCargar?.(datos, carga));
  const avisar = useEffectEvent((error, carga) => alFallar?.(error, carga));

  useEffect(() => {
    if (!activa) return undefined;
    let vigente = true;
    // Silenciosa solo si la lanza un `recargar({ silenciosa: true })` que aún
    // no había lanzado ninguna
    const silenciosa = recarga !== recargaConsumidaRef.current && recarga.silenciosa;
    recargaConsumidaRef.current = recarga;
    const carga = { silenciosa };
    const cargar = async () => {
      if (!silenciosa) setEnCurso(true);
      try {
        const datos = await pedirAhora();
        if (vigente) aplicar(datos, carga);
      } catch (error) {
        if (vigente) avisar(error, carga);
      } finally {
        if (vigente) setEnCurso(false);
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias son las de quien llama: el linter las comprueba en cada llamada (additionalHooks en eslint.config.js) y aquí solo se pasan a React, en vez de volver a comparar a mano lo que ya compara useEffect
  }, [activa, recarga, ...deps]);

  // La espera, ya en el pintado del botón que recarga, como cuando el botón
  // llamaba a la carga directamente
  const recargar = ({ silenciosa = false } = {}) => {
    if (!silenciosa) setEnCurso(true);
    setRecarga({ silenciosa });
  };

  return { cargando: activa && enCurso, recargar };
};
