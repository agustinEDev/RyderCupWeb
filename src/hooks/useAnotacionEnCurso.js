import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from './useAuth';
import {
  estadoDeEstaAnotacion,
  guardaLaAnotacionEnCurso,
  olvidaLaAnotacionEnCurso,
} from '../utils/anotacionEnCurso';

/**
 * La anotación apunta dónde está para volver a ella si iOS cierra la app, y al cargar
 * repone lo que apuntó: la pestaña, el hoyo y el mapa (11 nov 2026). Las tres
 * anotaciones lo usan; ninguna toca el almacenamiento.
 *
 * - Al montar lee lo guardado de ESTA anotación. Cuando la pantalla tiene sus datos
 *   (`cargada`), lo pone una sola vez: la pestaña si es una de las suyas, el hoyo
 *   (nunca más allá del último) y, ya en ese hoyo, el mapa si estaba abierto y se puede.
 * - Solo después guarda, y cada cambio de pestaña, hoyo o mapa: antes, el hoyo 1 con el
 *   que arranca la pantalla pisaría el guardado.
 * - Al pasar a segundo plano renueva la hora: las 6 horas cuentan desde ahí.
 * - Terminada (o la tarjeta entregada) la olvida y deja de guardar.
 * - Al salir de la anotación (la pantalla se desmonta) la olvida: se dejó a propósito.
 *   Un cierre de iOS o una recarga no desmontan nada: lo guardado sigue.
 *
 * @param {{
 *   cargada: boolean, terminada: boolean,
 *   pestana: string, pestanas: string[], alCambiarDePestana: (p: string) => void,
 *   hoyo: number, totalHoyos: number, alCambiarDeHoyo: (h: number) => void,
 *   mapa: {abierto: boolean, disponible: boolean, abrir: () => void},
 * }} anotacion
 */
export function useAnotacionEnCurso({
  cargada,
  terminada,
  pestana,
  pestanas,
  alCambiarDePestana,
  hoyo,
  totalHoyos,
  alCambiarDeHoyo,
  mapa,
}) {
  const { user } = useAuth();
  const cuenta = user?.id ?? null;
  const { pathname, search } = useLocation();
  const [guardado] = useState(() => (cuenta ? estadoDeEstaAnotacion({ cuenta, pathname, search }) : null));
  // Solo se leen y escriben en los efectos. Los tres efectos corren en este orden en cada
  // pasada: reponer, abrir el mapa, guardar; así el guardado ve lo ya repuesto
  const repuesta = useRef(false);
  const mapaEnElHoyo = useRef(null);
  const ultimo = useRef(null);

  useEffect(() => {
    if (repuesta.current || !cargada) return;
    repuesta.current = true;
    if (!guardado || terminada) return;
    if (pestanas.includes(guardado.pestana)) alCambiarDePestana(guardado.pestana);
    const enElHoyo = Math.min(guardado.hoyo, Math.max(1, totalHoyos || guardado.hoyo));
    alCambiarDeHoyo(enElHoyo);
    if (guardado.mapa) mapaEnElHoyo.current = enElHoyo;
  }, [cargada, guardado, terminada, pestanas, alCambiarDePestana, totalHoyos, alCambiarDeHoyo]);

  // El mapa, ya en su hoyo: abierto en otro mostraría el hoyo equivocado
  const { abierto: mapaAbierto, disponible: mapaDisponible, abrir: abrirElMapa } = mapa;
  useEffect(() => {
    if (mapaEnElHoyo.current === null || hoyo !== mapaEnElHoyo.current) return;
    mapaEnElHoyo.current = null;
    if (mapaDisponible && !mapaAbierto) abrirElMapa();
  }, [cargada, hoyo, mapaDisponible, mapaAbierto, abrirElMapa]);

  useEffect(() => {
    if (terminada) {
      ultimo.current = null;
      olvidaLaAnotacionEnCurso();
      return;
    }
    const listo = repuesta.current && mapaEnElHoyo.current === null && cuenta !== null;
    ultimo.current = listo ? { cuenta, pathname, search, pestana, hoyo, mapa: Boolean(mapaAbierto) } : null;
    if (ultimo.current) guardaLaAnotacionEnCurso(ultimo.current);
  }, [cargada, terminada, cuenta, pathname, search, pestana, hoyo, mapaAbierto]);

  // Al pasar a segundo plano, la hora de nuevo: las 6 horas cuentan desde ahí
  useEffect(() => {
    const alOcultarse = () => {
      if (document.visibilityState === 'hidden' && ultimo.current) guardaLaAnotacionEnCurso(ultimo.current);
    };
    document.addEventListener('visibilitychange', alOcultarse);
    return () => document.removeEventListener('visibilitychange', alOcultarse);
  }, []);

  // Salir de la anotación la olvida
  useEffect(() => () => olvidaLaAnotacionEnCurso(), []);
}
