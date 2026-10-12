import { useEffect, useId, useSyncExternalStore } from 'react';

/**
 * La pantalla de anotar que está sin red, para el aviso de arriba.
 *
 * Salían dos avisos casi iguales a la vez: el de toda la aplicación y el de la
 * pantalla de anotar (2.ª pasada del QA, 12 oct 2026). Ahora la pantalla solo
 * cuenta que está anotando sin red y cuántas anotaciones esperan, y el de
 * arriba lo dice todo en uno.
 *
 * Cada pantalla publica lo suyo con su clave: si hay dos a la vez, al irse una
 * no se borra lo de la otra (revisor).
 */
const pantallas = new Map();
let anotando = null;
const oyentes = new Set();

const avisa = () => {
  // Las pendientes de todas: van a la misma cola
  anotando =
    pantallas.size === 0
      ? null
      : { pendientes: [...pantallas.values()].reduce((total, n) => total + n, 0) };
  oyentes.forEach((oyente) => oyente());
};

const suscribe = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

/** Lo que dijeron las pantallas de anotar: `{ pendientes }`, o null si no hay ninguna sin red. */
export const useAnotacionSinConexion = () =>
  useSyncExternalStore(suscribe, () => anotando, () => null);

/** La pantalla de anotar lo dice mientras está sin red; al irse, lo retira. */
export const usePublicarAnotacionSinConexion = (pendientes) => {
  const clave = useId();
  useEffect(() => {
    pantallas.set(clave, pendientes);
    avisa();
    return () => {
      pantallas.delete(clave);
      avisa();
    };
  }, [clave, pendientes]);
};
