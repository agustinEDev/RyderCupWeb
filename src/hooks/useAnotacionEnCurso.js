import { useEffect, useRef } from 'react';
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
 * - Cuando la pantalla tiene sus datos (`cargada`), lee lo guardado de ESTA anotación y
 *   lo pone una sola vez: la pestaña si es una de las suyas, el hoyo (nunca más allá del
 *   último) y, ya en ese hoyo, el mapa si estaba abierto y la pantalla lo ofrece
 *   (`mapa.disponible`). Si el jugador se mueve antes, manda lo suyo.
 * - Solo después guarda, y cada cambio de pestaña, hoyo o mapa: antes, el hoyo 1 con el
 *   que arranca la pantalla pisaría el guardado.
 * - Al pasar a segundo plano y al volver renueva la hora: las 6 horas cuentan desde ahí.
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
  const ruta = `${pathname}${search}`;
  // Solo se leen y escriben en los efectos, que corren en este orden en cada pasada:
  // reponer, esperar a que la pantalla esté en lo repuesto, guardar
  const repuestaPara = useRef(null);
  // Lo repuesto mientras la pantalla no lo refleje: hasta entonces no se guarda, o el
  // hoyo 1 y la pestaña con los que arranca pisarían lo guardado (revisor, 11 nov 2026)
  const pendiente = useRef(null);
  const ultimo = useRef(null);
  const { abierto: mapaAbierto, disponible: mapaDisponible, abrir: abrirElMapa } = mapa;

  // Una vez por anotación: también si la pantalla pasa de un partido a otro sin
  // desmontarse. Lo guardado se lee aquí, cuando la pantalla tiene sus datos
  useEffect(() => {
    if (!cargada || repuestaPara.current === ruta) return;
    repuestaPara.current = ruta;
    pendiente.current = null;
    const guardado = cuenta && !terminada ? estadoDeEstaAnotacion({ cuenta, pathname, search }) : null;
    if (!guardado) return;
    const pestanaRepuesta = pestanas.includes(guardado.pestana) ? guardado.pestana : null;
    if (pestanaRepuesta) alCambiarDePestana(pestanaRepuesta);
    const enElHoyo = Math.min(guardado.hoyo, Math.max(1, totalHoyos || guardado.hoyo));
    alCambiarDeHoyo(enElHoyo);
    pendiente.current = { hoyo: enElHoyo, hoyoDeAntes: hoyo, pestana: pestanaRepuesta, mapa: guardado.mapa };
  }, [cargada, ruta, cuenta, terminada, pathname, search, pestanas, alCambiarDePestana, totalHoyos, alCambiarDeHoyo, hoyo]);

  useEffect(() => {
    const p = pendiente.current;
    if (!p) return;
    const enElHoyo = hoyo === p.hoyo;
    const enLaPestana = p.pestana === null || pestana === p.pestana;
    if (enElHoyo) p.hoyoVisto = true;
    if (enLaPestana) p.pestanaVista = true;
    // El jugador se movió (a otro hoyo u otra pestaña, también de vuelta a la de
    // antes) antes de que se repusiera todo: manda lo suyo
    const seMovio =
      (!enElHoyo && (p.hoyoVisto || hoyo !== p.hoyoDeAntes)) || (!enLaPestana && p.pestanaVista);
    if (seMovio) {
      pendiente.current = null;
      return;
    }
    if (!enElHoyo || !enLaPestana) return;
    // El mapa, ya en su hoyo: abierto en otro mostraría el hoyo equivocado. Si no llega
    // a abrirse, el primer movimiento del jugador (`seMovio`) suelta el guardado; abrirlo
    // dos veces no apila nada (`useMapaDelHoyo` lo evita)
    if (p.mapa && mapaDisponible && !mapaAbierto) {
      abrirElMapa();
      return;
    }
    pendiente.current = null;
  }, [cargada, hoyo, pestana, mapaDisponible, mapaAbierto, abrirElMapa]);

  useEffect(() => {
    if (terminada) {
      ultimo.current = null;
      olvidaLaAnotacionEnCurso();
      return;
    }
    const listo = repuestaPara.current === ruta && pendiente.current === null && cuenta !== null;
    ultimo.current = listo ? { cuenta, pathname, search, pestana, hoyo, mapa: Boolean(mapaAbierto) } : null;
    if (ultimo.current) guardaLaAnotacionEnCurso(ultimo.current);
  }, [cargada, terminada, cuenta, ruta, pathname, search, pestana, hoyo, mapaAbierto]);

  // Al pasar a segundo plano y al volver, la hora de nuevo: las 6 horas cuentan desde la
  // última vez en la anotación, también si la app sigue viva horas en segundo plano
  useEffect(() => {
    const alCambiarDeVisibilidad = () => {
      if (ultimo.current) guardaLaAnotacionEnCurso(ultimo.current);
    };
    document.addEventListener('visibilitychange', alCambiarDeVisibilidad);
    return () => document.removeEventListener('visibilitychange', alCambiarDeVisibilidad);
  }, []);

  // Salir de la anotación la olvida
  useEffect(() => () => olvidaLaAnotacionEnCurso(), []);
}
