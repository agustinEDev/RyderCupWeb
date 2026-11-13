import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';

// Cómo acaba la promesa de un `recargar()` cuya carga no llegó a aplicarse
const DESCARTADA = Object.freeze({ estado: 'descartada' });

const mismasDependencias = (antes, ahora) =>
  antes !== null && antes.length === ahora.length && antes.every((valor, i) => Object.is(valor, ahora[i]));

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
 * La espera sale ya puesta en la primera carga y en el pintado de `recargar()`.
 * Al cambiar las dependencias o al volver a activarse sale con el efecto, un
 * pintado después, igual que antes de este hook.
 *
 * @param {() => Promise<*>} pedir - Lo que se pide; se llama dentro del efecto.
 * @param {Array} deps - Cuándo se vuelve a pedir.
 * @param {Object} [opciones]
 * @param {boolean} [opciones.activa=true] - Inactiva no pide y no espera.
 * @param {(datos: *, carga: { silenciosa: boolean }) => void} [opciones.alCargar]
 * @param {(error: Error, carga: { silenciosa: boolean }) => void} [opciones.alFallar]
 * @returns {{ cargando: boolean, recargar: (opciones?: { silenciosa?: boolean }) => Promise<Object> }}
 *   `recargar()` vuelve a pedir con la espera; `recargar({ silenciosa: true })`,
 *   sin ella. Devuelve una promesa que se cumple cuando SU carga termina, ya
 *   después de `alCargar`/`alFallar`: `{ estado: 'cargada', datos }`,
 *   `{ estado: 'fallida', error }` o, si se descartó (otra más nueva, cambian
 *   las dependencias, se desactiva o se desmonta), `{ estado: 'descartada' }`.
 *   Nunca se rechaza: se puede esperar sin try/catch.
 */
export const useCargaCancelableEffect = (pedir, deps, { activa = true, alCargar, alFallar } = {}) => {
  // Hasta que no termine una carga se espera: también antes de la primera
  const [enCurso, setEnCurso] = useState(true);
  // Cada `recargar()` es un objeto nuevo: es lo que vuelve a lanzar el efecto
  const [recarga, setRecarga] = useState({ silenciosa: false });
  // El último `recargar()` que ya lanzó su carga: si el efecto vuelve a correr
  // por otra cosa (cambian las dependencias), esa carga ya no es silenciosa
  const recargaConsumidaRef = useRef(null);
  // Con qué dependencias corrió la última vez: una carga solo es silenciosa si
  // lo ÚNICO nuevo es el `recargar({ silenciosa: true })`. Si a la vez cambió
  // algo más (otro filtro), es una carga nueva y espera como cualquiera
  const depsAnterioresRef = useRef(null);
  // Sube en cada `recargar()`: la carga en vuelo de antes deja de ser la vigente
  // ya en ese momento, no cuando React pinte y limpie su efecto. Si no, una que
  // fallara en ese hueco avisaba como si fuera la actual (CodeRabbit, FE #1111)
  const generacionRef = useRef(0);
  // Quién cumple la promesa del último `recargar()`: el siguiente o el
  // desmontaje la dan por descartada si su carga no llegó a cumplirla
  const pendienteRef = useRef(null);

  const pedirAhora = useEffectEvent(() => pedir());
  const aplicar = useEffectEvent((datos, carga) => alCargar?.(datos, carga));
  const avisar = useEffectEvent((error, carga) => alFallar?.(error, carga));

  useEffect(() => {
    const recargaNueva = recarga !== recargaConsumidaRef.current;
    const mismas = mismasDependencias(depsAnterioresRef.current, deps);
    // Inactiva olvida con qué corrió: al activarse, la carga es nueva y espera,
    // aunque entretanto se pidiera un `recargar({ silenciosa: true })`
    depsAnterioresRef.current = activa ? deps : null;
    if (!activa) return undefined;
    recargaConsumidaRef.current = recarga;
    let vigente = true;
    // Silenciosa solo si la lanza un `recargar({ silenciosa: true })` que aún
    // no había lanzado ninguna, y nada más ha cambiado
    const silenciosa = recargaNueva && recarga.silenciosa && mismas;
    const carga = { silenciosa };
    const generacion = generacionRef.current;
    const esLaVigente = () => vigente && generacion === generacionRef.current;
    // Esta carga es la del `recargar()` solo si es la primera que lanza
    const cumplir = recargaNueva ? recarga.cumplir : undefined;
    const cargar = async () => {
      if (!silenciosa) setEnCurso(true);
      let resultado = DESCARTADA;
      try {
        const datos = await pedirAhora();
        if (esLaVigente()) {
          aplicar(datos, carga);
          resultado = { estado: 'cargada', datos };
        }
      } catch (error) {
        if (esLaVigente()) {
          avisar(error, carga);
          resultado = { estado: 'fallida', error };
        }
      } finally {
        if (esLaVigente()) setEnCurso(false);
        cumplir?.(resultado);
      }
    };
    cargar();
    return () => {
      vigente = false;
      // Descartada ya al limpiar, sin esperar a que llegue; si ya terminó, no cambia
      cumplir?.(DESCARTADA);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias son las de quien llama: el linter las comprueba en cada llamada (additionalHooks en eslint.config.js) y aquí solo se pasan a React, en vez de volver a comparar a mano lo que ya compara useEffect
  }, [activa, recarga, ...deps]);

  // La espera, ya en el pintado del botón que recarga, como cuando el botón
  // llamaba a la carga directamente
  // Estable: se pasa como prop y puede acabar en las dependencias de otro efecto
  const recargar = useCallback(({ silenciosa = false } = {}) => {
    generacionRef.current += 1;
    // La del `recargar()` anterior ya no se aplicará: si no terminó, descartada
    pendienteRef.current?.(DESCARTADA);
    let cumplir;
    const promesa = new Promise((resolver) => {
      cumplir = resolver;
    });
    pendienteRef.current = cumplir;
    if (!silenciosa) setEnCurso(true);
    setRecarga({ silenciosa, cumplir });
    return promesa;
  }, []);

  // Un `recargar()` estando inactiva no llega a pedir: al desmontar, descartado
  useEffect(() => () => pendienteRef.current?.(DESCARTADA), []);

  return { cargando: activa && enCurso, recargar };
};
