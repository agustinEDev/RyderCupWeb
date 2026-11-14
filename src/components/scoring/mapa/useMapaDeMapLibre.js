import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Map as MapaDeMapLibre } from 'maplibre-gl';
import { limitesDelHoyo } from '../../../domain/services/geometriaDelHoyo';
import { circuloAlrededor } from '../../../domain/services/hoyoMarcado';
import { captureError } from '../../../utils/sentryHelpers';
import { ponerOrtofoto } from './teselas';
import { opcionesDelMapa, ponerCapasDelHoyo } from './estiloDelMapa';

/**
 * El mapa de MapLibre del hoyo: se crea en la ref del contenedor (`montarMapa`,
 * que se pone en su `ref`) y se va con él, con todos sus marcadores. Al cargar
 * el estilo pone la ortofoto de la comunidad y las capas del hoyo; en cuanto la
 * ventana está pintada, y cada vez que el panel de abajo crece, lo encuadra.
 *
 * Sin WebGL no hay mapa: lo apunta en Sentry y llama a `setSinMapa(true)`.
 */
export const useMapaDeMapLibre = (
  {
    mapaRef,
    contenedorRef,
    abajoRef,
    inicioRef,
    hoyoActualRef,
    ultimaMedidaRef,
    ultimaLineaRef,
    movidoPorElJugadorRef,
    yaEmpezoRef,
    tocadoAhoraRef,
    alTocarRef,
    ultimaVistaRef,
    etiquetasDeLaLineaRef,
    etiquetasDeLaMedidaRef,
    puntosDeLaLineaRef,
    marcaDeLaSalidaRef,
    marcaGpsRef,
    marcaTocadaRef,
    marcaMedidaRef,
    marcaDelOrigenRef,
  },
  { comunidad, margen, encuadrarHoyo, aplicarVista, setSinMapa },
) => {
  // La comunidad de ahora, para el `load`; si cambia después (la ubicación del
  // campo llega tarde), se pone entonces. Antes de cargar, MapLibre no deja
  const comunidadAhoraRef = useRef(comunidad);
  const estiloCargadoRef = useRef(false);
  useEffect(() => {
    comunidadAhoraRef.current = comunidad;
    if (estiloCargadoRef.current && mapaRef.current)
      ponerOrtofoto(mapaRef.current, comunidad);
  }, [comunidad, mapaRef]);

  // El mapa se crea en la ref del contenedor, que corre antes que los efectos de
  // abajo (que ya lo encuentran hecho) y devuelve su limpieza (React 19)
  const montarMapa = useCallback(
    (nodo) => {
      if (!nodo) return undefined;
      contenedorRef.current = nodo;
      const {
        hoyo: h,
        conMapa: orientado,
        centroSinMapa: delCampo,
      } = inicioRef.current;
      // Sin la ubicación del campo, la salida del hoyo si la tiene (no España entera)
      const centro = delCampo ?? h?.playLine?.[0] ?? h?.green?.center ?? null;
      let mapa;
      try {
        mapa = new MapaDeMapLibre(
          opcionesDelMapa(nodo, {
            orientado,
            rumbo: inicioRef.current.rumbo,
            centro,
          }),
        );
      } catch (error) {
        captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
        setSinMapa(true);
        return undefined;
      }
      mapaRef.current = mapa;
      if (orientado) {
        mapa.touchZoomRotate.disableRotation();
        mapa.keyboard.disableRotation();
        // Uno ya aquí, por si acaso; el bueno, en cuanto la ventana está pintada
        encuadrarHoyo(false);
      }
      mapa.on('load', () => {
        // Antes que lo demás: va justo encima de la PNOA, debajo de las líneas
        ponerOrtofoto(mapa, comunidadAhoraRef.current);
        estiloCargadoRef.current = true;
        // El hoyo de ahora, no el de al abrir: pudo cambiar antes de que cargara
        ponerCapasDelHoyo(mapa, {
          hoyo: hoyoActualRef.current,
          medida: ultimaMedidaRef.current,
          linea: ultimaLineaRef.current,
        });
      });
      // Con `originalEvent`, lo movió el jugador (no un `jumpTo` nuestro)
      mapa.on('movestart', (e) => {
        if (e.originalEvent) movidoPorElJugadorRef.current = true;
      });
      // Un toque sin arrastrar mide; arrastrar y pellizcar mueven el mapa
      mapa.on('click', (e) =>
        alTocarRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng }),
      );
      return () => {
        // Sus marcadores se van con él: el mapa nuevo (React lo monta dos veces
        // en desarrollo) pone los suyos, no mueve los de este
        for (const m of [
          ...etiquetasDeLaLineaRef.current,
          ...etiquetasDeLaMedidaRef.current,
          ...puntosDeLaLineaRef.current,
          marcaDeLaSalidaRef.current,
          marcaGpsRef.current,
          marcaTocadaRef.current,
          marcaMedidaRef.current,
          marcaDelOrigenRef.current,
        ])
          m?.remove();
        etiquetasDeLaLineaRef.current = [];
        etiquetasDeLaMedidaRef.current = [];
        puntosDeLaLineaRef.current = [];
        marcaDeLaSalidaRef.current = null;
        marcaGpsRef.current = null;
        marcaTocadaRef.current = null;
        marcaMedidaRef.current = null;
        marcaDelOrigenRef.current = null;
        estiloCargadoRef.current = false;
        mapa.remove();
        mapaRef.current = null;
      };
    },
    [
      encuadrarHoyo,
      setSinMapa,
      mapaRef,
      contenedorRef,
      inicioRef,
      hoyoActualRef,
      ultimaMedidaRef,
      ultimaLineaRef,
      movidoPorElJugadorRef,
      alTocarRef,
      etiquetasDeLaLineaRef,
      etiquetasDeLaMedidaRef,
      puntosDeLaLineaRef,
      marcaDeLaSalidaRef,
      marcaGpsRef,
      marcaTocadaRef,
      marcaMedidaRef,
      marcaDelOrigenRef,
    ],
  );

  // En cuanto la ventana está pintada (la cabecera y el panel de abajo ya se
  // pueden medir), y antes de que el jugador pueda tocar nada, el hoyo se
  // encuadra lo más grande que quepa. No se espera a `load`: con mala cobertura
  // tarda, y al llegar le quitaría lo que estuviera mirando (revisión, 16 oct)
  useLayoutEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    mapa.resize?.();
    const {
      hoyo: h,
      conMapa: orientado,
      soloGreen,
      metros: deLaTarjeta,
    } = inicioRef.current;
    if (orientado) encuadrarHoyo(false);
    else if (soloGreen && deLaTarjeta && h?.playLine?.[0]) {
      mapa.fitBounds(
        limitesDelHoyo({
          playLine: circuloAlrededor(h.playLine[0], deLaTarjeta / 2),
        }),
        {
          bearing: 0,
          padding: margen(),
          animate: false,
        },
      );
    }
  }, [encuadrarHoyo, margen, mapaRef, inicioRef]);
  // El panel de abajo crece después (el recuadro, los avisos del GPS): si el
  // jugador aún no ha tocado ni movido nada, el hoyo se vuelve a encuadrar para
  // que no quede debajo (/code-review, 16 oct)
  useEffect(() => {
    const panel = abajoRef.current;
    const Observador = globalThis.ResizeObserver;
    if (!panel || !Observador || !inicioRef.current.conMapa) return undefined;
    const observador = new Observador(() => {
      if (
        movidoPorElJugadorRef.current ||
        yaEmpezoRef.current ||
        tocadoAhoraRef.current
      )
        return;
      // Orientado después de abrir, lo de entonces; si no, el hoyo (/code-review)
      if (ultimaVistaRef.current) aplicarVista(ultimaVistaRef.current, false);
      else encuadrarHoyo(false);
    });
    observador.observe(panel);
    return () => observador.disconnect();
  }, [
    encuadrarHoyo,
    aplicarVista,
    abajoRef,
    inicioRef,
    movidoPorElJugadorRef,
    yaEmpezoRef,
    tocadoAhoraRef,
    ultimaVistaRef,
  ]);

  return montarMapa;
};
