import { useEffect, useSyncExternalStore } from 'react';

/**
 * La pantalla de anotar que está sin red, para el aviso de arriba.
 *
 * Salían dos avisos casi iguales a la vez: el de toda la aplicación y el de la
 * pantalla de anotar (2.ª pasada del QA, 12 oct 2026). Ahora la pantalla solo
 * cuenta que está anotando sin red y cuántas anotaciones esperan, y el de
 * arriba lo dice todo en uno.
 */
let anotando = null;
const oyentes = new Set();

const avisa = () => oyentes.forEach((oyente) => oyente());

const suscribe = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

/** Lo que dijo la pantalla de anotar: `{ pendientes }`, o null si no hay ninguna sin red. */
export const useAnotacionSinConexion = () =>
  useSyncExternalStore(suscribe, () => anotando, () => null);

/** La pantalla de anotar lo dice mientras está sin red; al irse, lo retira. */
export const usePublicarAnotacionSinConexion = (pendientes) => {
  useEffect(() => {
    anotando = { pendientes };
    avisa();
    return () => {
      anotando = null;
      avisa();
    };
  }, [pendientes]);
};
