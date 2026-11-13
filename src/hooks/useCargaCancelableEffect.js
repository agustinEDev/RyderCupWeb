import { useEffect, useEffectEvent, useRef, useState } from 'react';

const mismasDependencias = (antes, ahora) =>
  antes.length === ahora.length && antes.every((valor, i) => Object.is(valor, ahora[i]));

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
 * @returns {{ cargando: boolean, recargar: (opciones?: { silenciosa?: boolean }) => void }}
 *   `recargar()` vuelve a pedir con la espera; `recargar({ silenciosa: true })`,
 *   sin ella.
 */
export const useCargaCancelableEffect = (pedir, deps, { activa = true, alCargar, alFallar } = {}) => {
  // Hasta que no termine una carga se espera: también antes de la primera, que
  // al activarse la espera ya está puesta
  const [enCurso, setEnCurso] = useState(true);
  // Cada `recargar()` es un objeto nuevo: es lo que la distingue de la anterior
  const [recarga, setRecarga] = useState({ silenciosa: false });
  // El número de la carga vigente: una que no lo tenga ya no toca nada
  const vigenteRef = useRef(0);
  // Con qué se pidió la última: para saber, tras cada pintado, si toca otra
  const anteriorRef = useRef(null);

  const pedirAhora = useEffectEvent(() => pedir());
  const aplicar = useEffectEvent((datos, carga) => alCargar?.(datos, carga));
  const avisar = useEffectEvent((error, carga) => alFallar?.(error, carga));

  // Al desmontar (también en el desmontaje de prueba de StrictMode) nada en
  // vuelo vale ya, y al volver a montar se pide otra vez
  useEffect(() => {
    const vigente = vigenteRef;
    const anterior = anteriorRef;
    return () => {
      vigente.current += 1;
      anterior.current = null;
    };
  }, []);

  // Sin lista de dependencias a propósito: corre tras cada pintado y compara él
  // las `deps` del que llama, que el linter comprueba en su llamada. Una que
  // cambie en cada pintado vuelve a pedir, como lo haría un useEffect, pero sin
  // relanzarse antes de que termine la anterior
  useEffect(() => {
    const antes = anteriorRef.current;
    anteriorRef.current = { deps, activa, recarga };
    const mismaVuelta = antes !== null && antes.activa === activa && (!activa || mismasDependencias(antes.deps, deps));
    if (mismaVuelta && antes.recarga === recarga) return;

    const mia = ++vigenteRef.current;
    if (!activa) return;
    // Silenciosa solo si lo único que cambió es que se pidió así
    const carga = { silenciosa: mismaVuelta && recarga.silenciosa };
    const esLaVigente = () => mia === vigenteRef.current;
    const cargar = async () => {
      if (!carga.silenciosa) setEnCurso(true);
      try {
        const datos = await pedirAhora();
        if (esLaVigente()) aplicar(datos, carga);
      } catch (error) {
        if (esLaVigente()) avisar(error, carga);
      } finally {
        if (esLaVigente()) setEnCurso(false);
      }
    };
    cargar();
  });

  // La espera, ya en el pintado del botón que recarga, como cuando el botón
  // llamaba a la carga directamente
  const recargar = ({ silenciosa = false } = {}) => {
    if (!silenciosa) setEnCurso(true);
    setRecarga({ silenciosa });
  };

  return { cargando: activa && enCurso, recargar };
};
