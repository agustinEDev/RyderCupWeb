import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Marker } from 'maplibre-gl';
import { captureError } from '../../../utils/sentryHelpers';
import { geojsonDeLaLinea, geojsonDelHoyo, lngLat, tipoDelPunto, tramosDeLaLinea } from './geometriaDelMapa';
import { CLASE_DEL_PUNTO, punto, sincronizarCifras } from './marcadoresDelMapa';

/**
 * Los metros de cada tramo de la línea que se ve y la línea discontinua del
 * hoyo, sobre el mapa ya montado (`mapaRef`).
 *
 * Devuelve las refs con lo de ahora para el arrastre de los puntos
 * (`usePuntosDeLaLinea`): las cifras y el «empezar».
 */
export const useLineaDelHoyoEnElMapa = (
  { mapaRef, etiquetasDeLaLineaRef, hoyoActualRef },
  { lineaVisible, textoDeTramo, empezar, linea, hoyo, hoyoAhora, greenMarcado, reporte, medido },
) => {
  // Como las de medir, se mueven y se reescriben, no se rehacen; también
  // mientras se arrastra, antes de soltar
  const ponerCifrasDeLaLinea = useCallback(
    (puntos) => {
      const mapa = mapaRef.current;
      if (!mapa) return;
      sincronizarCifras(mapa, etiquetasDeLaLineaRef.current, tramosDeLaLinea(puntos), { tipo: 'linea', color: 'text-white', texto: textoDeTramo });
    },
    [textoDeTramo, mapaRef, etiquetasDeLaLineaRef],
  );
  useEffect(() => ponerCifrasDeLaLinea(lineaVisible), [lineaVisible, ponerCifrasDeLaLinea]);
  // Para el arrastre, las de ahora: los puntos no se rehacen si solo cambian ellas
  const cifrasAlArrastrarRef = useRef(ponerCifrasDeLaLinea);
  const empezarAlArrastrarRef = useRef(empezar);
  useLayoutEffect(() => {
    cifrasAlArrastrarRef.current = ponerCifrasDeLaLinea;
    empezarAlArrastrarRef.current = empezar;
  }, [ponerCifrasDeLaLinea, empezar]);
  // La línea discontinua del hoyo, del mismo hoyo que sus cifras; con la línea
  // que se mueve, solo su green (la línea va aparte, entera)
  const hoyoQueSeDibuja = useMemo(() => {
    if (linea) return { playLine: [], green: hoyoAhora?.green ?? null };
    if (reporte) return { playLine: [], green: null };
    // Midiendo un punto, del hoyo solo su green (T2)
    if (medido) return { playLine: [], green: hoyoAhora?.green ?? null };
    return greenMarcado ? hoyoAhora : hoyo;
  }, [linea, hoyo, hoyoAhora, greenMarcado, reporte, medido]);
  useEffect(() => {
    hoyoActualRef.current = hoyoQueSeDibuja;
    mapaRef.current?.getSource('hoyo')?.setData(geojsonDelHoyo(hoyoQueSeDibuja));
  }, [hoyoQueSeDibuja, hoyoActualRef, mapaRef]);

  return { cifrasAlArrastrarRef, empezarAlArrastrarRef };
};

/**
 * La salida que se pinta mientras se pide el green, y la línea con sus puntos:
 * la salida, los codos y el green se arrastran; con el dedo, la línea y sus
 * cifras lo siguen, y al soltar queda movida (`setEdicion`).
 */
export const usePuntosDeLaLinea = (
  { mapaRef, marcaDeLaSalidaRef, puntosDeLaLineaRef, cifrasAlArrastrarRef, empezarAlArrastrarRef },
  { salidaQueSePinta, datosDeLaLinea, lineaQueSePinta, linea, greenMarcado, menuDeMotivos, setEdicion, setConAyudaDeCodos },
) => {
  useEffect(() => {
    const mapa = mapaRef.current;
    marcaDeLaSalidaRef.current?.remove();
    marcaDeLaSalidaRef.current = null;
    if (!mapa || !salidaQueSePinta) return;
    marcaDeLaSalidaRef.current = new Marker({ element: punto(CLASE_DEL_PUNTO.salida) }).setLngLat(lngLat(salidaQueSePinta)).addTo(mapa);
  }, [salidaQueSePinta, mapaRef, marcaDeLaSalidaRef]);
  // La línea y sus puntos: la salida, los codos y el green se arrastran; con el
  // dedo, la línea y sus cifras lo siguen, y al soltar queda movida
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    mapa.getSource('marcado')?.setData(datosDeLaLinea);
    for (const m of puntosDeLaLineaRef.current) m.remove();
    puntosDeLaLineaRef.current = [];
    const aqui = (e) => {
      const { lat, lng } = e.target.getLngLat();
      return { lat, lon: lng };
    };
    // El green que marcó quien no está en la salida, también se corrige
    // arrastrándolo: será el de los que vengan detrás (revisión, 17 oct)
    if (!linea && greenMarcado) {
      try {
        const m = new Marker({ element: punto(CLASE_DEL_PUNTO.green), draggable: true });
        puntosDeLaLineaRef.current.push(m);
        m.setLngLat(lngLat(greenMarcado)).addTo(mapa);
        m.on('dragend', (e) => {
          const movido = aqui(e);
          setEdicion((ed) => ({ linea: null, green: movido, cambiada: true, version: ed.version + 1 }));
        });
        m.getElement().addEventListener('click', (e) => e.stopPropagation());
      } catch (error) {
        for (const x of puntosDeLaLineaRef.current) x.remove();
        puntosDeLaLineaRef.current = [];
        captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
      }
      return;
    }
    if (!lineaQueSePinta) return;
    const con = (i, p) => lineaQueSePinta.map((q, j) => (j === i ? p : q));
    // La línea ya viene con los codos de su par (como mucho dos): todos se mueven
    // Si la librería cambia y algo de esto falla, el mapa sigue (sin puntos que
    // mover) en vez de caerse entero; el fallo queda apuntado
    try {
      lineaQueSePinta.forEach((p, i) => {
        // Apuntado antes de ponerlo en el mapa: si algo falla después, se quita
        // Con el menú de motivos abierto no se mueve: lo que se moviera se
        // perdería al elegir o cancelar (/code-review)
        const m = new Marker({ element: punto(CLASE_DEL_PUNTO[tipoDelPunto(i, lineaQueSePinta)]), draggable: !menuDeMotivos });
        puntosDeLaLineaRef.current.push(m);
        m.setLngLat(lngLat(p)).addTo(mapa);
        // Cada `on` aparte: en MapLibre 6 devuelve una suscripción, no el marcador
        m.on('drag', (e) => {
          const provisional = con(i, aqui(e));
          mapa.getSource('marcado')?.setData(geojsonDeLaLinea(provisional));
          cifrasAlArrastrarRef.current(provisional);
        });
        m.on('dragend', (e) => {
          const movida = con(i, aqui(e));
          setEdicion((ed) => ({ linea: movida, green: null, cambiada: true, version: ed.version + 1 }));
          setConAyudaDeCodos(false);
          empezarAlArrastrarRef.current();
        });
        // Tocar un punto no es tocar el mapa: no mide encima de él
        m.getElement().addEventListener('click', (e) => e.stopPropagation());
      });
    } catch (error) {
      // Sin puntos sueltos: los que llegaron a ponerse, fuera también
      for (const m of puntosDeLaLineaRef.current) m.remove();
      puntosDeLaLineaRef.current = [];
      captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
    }
  }, [
    lineaQueSePinta,
    linea,
    datosDeLaLinea,
    greenMarcado,
    menuDeMotivos,
    mapaRef,
    puntosDeLaLineaRef,
    cifrasAlArrastrarRef,
    empezarAlArrastrarRef,
    setEdicion,
    setConAyudaDeCodos,
  ]);
};
