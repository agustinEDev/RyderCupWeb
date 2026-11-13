import { useCallback, useEffect, useRef } from 'react';
import { camaraGirada, rumbo } from '../../../domain/services/geometriaDelHoyo';
import { lngLat } from './geometriaDelMapa';

/**
 * Cómo se encuadra el mapa del hoyo: el hoyo entero, o de ti hacia un punto, y
 * lo que se orientó después de abrir (`vista`, O2-O5), que gira el mapa una vez
 * por cambio.
 *
 * Devuelve `encuadrarHoyo` y `aplicarVista`, y en `ultimaVistaRef` lo último que
 * se orientó (lo que se vuelve a encuadrar si el panel de abajo crece).
 */
export const useEncuadreDelHoyo = ({ mapaRef, contenedorRef, delEncuadreRef, inicioRef, movidoPorElJugadorRef, conVistaRef }, margen, vista) => {
  // Unos puntos, girados a `orientacion` y lo más grandes que quepan: el centro
  // y el zoom se calculan con ellos girados (`fitBounds` encuadra su caja
  // norte-sur, que girada ocupa mucho más, y el hoyo salía pequeño; 16 oct)
  const encuadrar = useCallback(
    (h, orientacion, animar) => {
      const mapa = mapaRef.current;
      if (!mapa) return;
      // Sin rumbo no hay hoyo orientado que encuadrar (el mapa va con el norte arriba)
      const girada = camaraGirada(h, orientacion, {
        ancho: contenedorRef.current?.clientWidth || 360,
        alto: contenedorRef.current?.clientHeight || 640,
        padding: margen(),
      });
      if (!girada) return;
      // Sin `padding`: MapLibre lo guardaría y lo sumaría a todo lo de después
      // (medir, «Céntrame»); el centro ya viene desplazado al medio del hueco
      const camara = { ...girada, center: lngLat(girada.center) };
      if (animar) mapa.easeTo(camara);
      else mapa.jumpTo(camara);
    },
    [margen, mapaRef, contenedorRef],
  );
  // El hoyo entero: la línea de ahora (la marcada o movida, O7); al montar, la de al abrir
  const encuadrarHoyo = useCallback(
    (animar) => {
      const { hoyo: h, rumbo: orientacion } = delEncuadreRef.current ?? inicioRef.current;
      encuadrar(h, orientacion, animar);
    },
    [encuadrar, delEncuadreRef, inicioRef],
  );
  // Lo que se orientó después de abrir (O2-O5): el hoyo, o de ti hacia un punto
  // con ese punto y el green a la vista (/code-review)
  const ultimaVistaRef = useRef(null);
  const aplicarVista = useCallback(
    (v, animar) => {
      if (v.tipo === 'hoyo') encuadrarHoyo(animar);
      else encuadrar({ playLine: [v.desde, v.hacia, v.green], green: null }, rumbo(v.desde, v.hacia), animar);
    },
    [encuadrar, encuadrarHoyo],
  );
  // Orientado después de abrir, ya no se gira con los dedos, como un hoyo con
  // mapa (O6). Si el jugador ya movió el mapa, lo que llega solo (el GPS) no
  // se lo quita (/code-review); lo que pide él, marcar, sí (CodeRabbit)
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!vista || !mapa || (movidoPorElJugadorRef.current && !vista.porElJugador)) return;
    conVistaRef.current = true;
    ultimaVistaRef.current = vista;
    mapa.dragRotate?.disable();
    mapa.touchZoomRotate?.disableRotation();
    mapa.keyboard?.disableRotation();
    aplicarVista(vista, true);
  }, [vista, aplicarVista, mapaRef, movidoPorElJugadorRef, conVistaRef]);

  return { encuadrarHoyo, aplicarVista, ultimaVistaRef };
};
