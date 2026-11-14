import { useEffect } from 'react';
import { Marker } from 'maplibre-gl';
import {
  enMedio,
  geojsonDeLaMedida,
  haciaElGreen,
  lngLat,
  tramosDesdeMi,
} from './geometriaDelMapa';
import { CLASE_DEL_PUNTO, punto, sincronizarCifras } from './marcadoresDelMapa';
import { ZOOM_SIN_MAPA } from './estiloDelMapa';

// Los marcadores sueltos del mapa del hoyo: tu posición, el codo de la línea
// de ti al green, el punto que se mide y desde dónde, y la línea de la medida
// con sus metros. Cada uno, un efecto sobre el mapa ya montado (`mapaRef`)

// Mi posición: el punto azul, y la primera vez sin mapa, el mapa va a ella
export const useMarcaDelGps = (
  {
    mapaRef,
    marcaGpsRef,
    inicioRef,
    centradoEnGpsRef,
    movidoPorElJugadorRef,
    conVistaRef,
  },
  posicion,
  lejos,
) => {
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (!posicion) {
      // Sin señal buena, el punto azul no se queda donde ya no estás
      marcaGpsRef.current?.remove();
      marcaGpsRef.current = null;
      return;
    }
    // Por encima de las cifras, que se crean después y lo tapaban, pero debajo
    // de los demás puntos (z-[2]); sin quedarse con el toque (QA, 26 oct)
    marcaGpsRef.current ??= new Marker({
      element: punto(
        'pointer-events-none z-[1] h-4 w-4 rounded-full border-[3px] border-white bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.3)]',
      ),
    })
      .setLngLat(lngLat(posicion))
      .addTo(mapa);
    marcaGpsRef.current.setLngLat(lngLat(posicion));
    // Lejos no; y si mientras tanto el jugador movió el mapa, tampoco al llegar
    // Ya orientado (O4, O5), tampoco: el salto cortaría el giro o deshace el encuadre (revisor)
    if (
      !inicioRef.current.conMapa &&
      !centradoEnGpsRef.current &&
      !lejos &&
      !movidoPorElJugadorRef.current &&
      !conVistaRef.current
    ) {
      centradoEnGpsRef.current = true;
      mapa.jumpTo({ center: lngLat(posicion), zoom: ZOOM_SIN_MAPA });
    }
  }, [
    posicion,
    lejos,
    mapaRef,
    marcaGpsRef,
    inicioRef,
    centradoEnGpsRef,
    movidoPorElJugadorRef,
    conVistaRef,
  ]);
};

// El codo de la línea de ti al green: sin tocar o donde se dejó
export const useMarcaDelCodo = (
  { mapaRef, marcaTocadaRef },
  { codoAhora, desdeMi, menuDeMotivos, setTocado },
) => {
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    // Midiendo desde ti, el punto es el codo y se arrastra (D3): si cambia eso,
    // se rehace
    // Con el menú de motivos abierto, quieto como los puntos de la línea (H9b)
    const arrastrable = desdeMi && !menuDeMotivos;
    if (
      !codoAhora ||
      (marcaTocadaRef.current &&
        marcaTocadaRef.current.arrastrable !== arrastrable)
    ) {
      marcaTocadaRef.current?.remove();
      marcaTocadaRef.current = null;
    }
    if (!codoAhora) return;
    if (!marcaTocadaRef.current) {
      const m = new Marker({
        element: punto(
          'h-3.5 w-3.5 rounded-full border-2 border-white bg-yellow-400 shadow z-[2]',
        ),
        draggable: arrastrable,
      });
      m.arrastrable = arrastrable;
      if (arrastrable) {
        // La línea y sus metros siguen al dedo (D3b)
        const moverElCodo = (e) => {
          const { lng, lat } = e.target.getLngLat();
          setTocado({ lat, lon: lng });
        };
        // Desde que se coge: una lectura del GPS antes del primer «drag» lo movía (/code-review)
        m.on('dragstart', moverElCodo);
        m.on('drag', moverElCodo);
        m.on('dragend', moverElCodo);
        m.getElement().addEventListener('click', (e) => e.stopPropagation());
      }
      marcaTocadaRef.current = m.setLngLat(lngLat(codoAhora)).addTo(mapa);
    }
    marcaTocadaRef.current.setLngLat(lngLat(codoAhora));
  }, [codoAhora, desdeMi, menuDeMotivos, mapaRef, marcaTocadaRef, setTocado]);
};

// El punto que se mide (19 oct): quieto, se cambia tocando otro. Sin
// quedarse los toques: tocar encima va al mapa y vuelve a medir
export const useMarcaMedida = ({ mapaRef, marcaMedidaRef }, medido) => {
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (!medido) {
      marcaMedidaRef.current?.remove();
      marcaMedidaRef.current = null;
      return;
    }
    if (!marcaMedidaRef.current) {
      const elemento = punto(
        'pointer-events-none h-3 w-3 rounded-full border-2 border-white bg-yellow-300 shadow z-[2]',
      );
      elemento.dataset.punto = 'medido';
      marcaMedidaRef.current = new Marker({ element: elemento })
        .setLngLat(lngLat(medido))
        .addTo(mapa);
    }
    marcaMedidaRef.current.setLngLat(lngLat(medido));
  }, [medido, mapaRef, marcaMedidaRef]);
};

// Sin tu posición se mide desde la salida, y con la línea del hoyo oculta, su
// punto se iba: se marca, quieto, para ver de dónde sale el golpe (19 oct, en
// el móvil). Con buen GPS el origen ya es tu punto azul
export const useMarcaDelOrigen = (
  { mapaRef, marcaDelOrigenRef },
  latDelOrigen,
  lonDelOrigen,
) => {
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (latDelOrigen === null || lonDelOrigen === null) {
      marcaDelOrigenRef.current?.remove();
      marcaDelOrigenRef.current = null;
      return;
    }
    if (!marcaDelOrigenRef.current) {
      const elemento = punto(CLASE_DEL_PUNTO.salida);
      elemento.dataset.punto = 'origen';
      marcaDelOrigenRef.current = new Marker({ element: elemento })
        .setLngLat([lonDelOrigen, latDelOrigen])
        .addTo(mapa);
    }
    marcaDelOrigenRef.current.setLngLat([lonDelOrigen, latDelOrigen]);
  }, [latDelOrigen, lonDelOrigen, mapaRef, marcaDelOrigenRef]);
};

// Las líneas de la medida y sus metros. Las etiquetas se mueven, no se
// rehacen, con cada lectura del GPS
export const useMedidaEnElMapa = (
  { mapaRef, ultimaMedidaRef, etiquetasDeLaMedidaRef },
  {
    desdeMi,
    reporte,
    menuDeMotivos,
    posicionBuena,
    tocado,
    medido,
    tramosDelToque,
    green,
    textoDeTramo,
  },
) => {
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const deMiAlGreen =
      desdeMi && !medido && (!reporte || menuDeMotivos)
        ? tramosDesdeMi(posicionBuena, tocado, green)
        : [];
    const tramos = [...deMiAlGreen, ...tramosDelToque];
    ultimaMedidaRef.current = geojsonDeLaMedida(tramos);
    mapa.getSource('medida')?.setData(ultimaMedidaRef.current);
    // Con un punto tocado, solo sus metros: los de la línea al green se pisarían (T3)
    // Una línea de ti al green, su cifra a 3/4: no tapa el codo sin tocar ni
    // salta al aparecer o irse (C2, C10)
    const donde = !medido && !tocado ? haciaElGreen : enMedio;
    sincronizarCifras(
      mapa,
      etiquetasDeLaMedidaRef.current,
      medido ? tramosDelToque : tramos,
      { tipo: 'medida', color: 'text-yellow-300', texto: textoDeTramo, donde },
    );
  }, [
    desdeMi,
    reporte,
    menuDeMotivos,
    posicionBuena,
    tocado,
    medido,
    tramosDelToque,
    green,
    textoDeTramo,
    mapaRef,
    ultimaMedidaRef,
    etiquetasDeLaMedidaRef,
  ]);
};

// La ubicación del campo llega después de abrir: centra el mapa si aún no lo
// hizo el GPS ni el jugador lo ha movido. Si el GPS lo llevó antes a otro
// sitio y resulta que estás lejos del campo, vuelve al campo, y al llegar a
// él el mapa irá a ti, igual que si la ubicación hubiera llegado primero. Es
// una vez: con el mapa ya en ti (cerca), no salta solo después
export const useCentrarEnElCampo = (
  { mapaRef, inicioRef, centradoEnGpsRef, movidoPorElJugadorRef, conVistaRef },
  centroSinMapa,
  lejos,
) => {
  useEffect(() => {
    const mapa = mapaRef.current;
    if (
      !mapa ||
      !centroSinMapa ||
      inicioRef.current.conMapa ||
      inicioRef.current.centroSinMapa
    )
      return;
    inicioRef.current.centroSinMapa = centroSinMapa;
    if (
      (centradoEnGpsRef.current && !lejos) ||
      movidoPorElJugadorRef.current ||
      conVistaRef.current
    )
      return;
    centradoEnGpsRef.current = false;
    mapa.jumpTo({ center: lngLat(centroSinMapa), zoom: ZOOM_SIN_MAPA });
  }, [
    centroSinMapa,
    lejos,
    mapaRef,
    inicioRef,
    centradoEnGpsRef,
    movidoPorElJugadorRef,
    conVistaRef,
  ]);
};
