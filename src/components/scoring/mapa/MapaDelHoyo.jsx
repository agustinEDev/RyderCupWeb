import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import './mapa.css';
import {
  distanciasDelHoyo,
  distanciasDesdeLaPosicion,
} from '../../../domain/services/distanciasDelHoyo';
import {
  orientacionDelHoyo,
  rumboDeLaLinea,
} from '../../../domain/services/geometriaDelHoyo';
import { salidaPorMetros } from '../../../domain/services/hoyoMarcado';
import ModalShell from '../../ui/ModalShell';
import {
  fraseDeLaLinea as fraseDeLosTramos,
  geojsonDeLaMedida,
  lineaParaMover,
  lngLat,
} from './geometriaDelMapa';
import { margenMedido } from './margenDelMapa';
import { useToquesDelMapa } from './useToquesDelMapa';
import { useEnvioAlCerrar } from './useEnvioAlCerrar';
import { useEncuadreDelHoyo } from './useEncuadreDelHoyo';
import { useMapaDeMapLibre } from './useMapaDeMapLibre';
import { useGpsDelHoyo } from './useGpsDelHoyo';
import { decidirConElGps, useLineaQueSeVe } from './useLineaQueSeVe';
import { useEstadoDeLaMarca } from './useEstadoDeLaMarca';
import { useAcercarseAlGreen } from './useAcercarseAlGreen';
import { salidaQueSePinta, sePuedeReportarElHoyo } from './reglasDelMapa';
import {
  avisoDelGps,
  loQueSeAnuncia,
  textosDelRecuadro,
} from './textosDelMapa';
import {
  useCentrarEnElCampo,
  useMarcaDelCodo,
  useMarcaDelGps,
  useMarcaDelOrigen,
  useMarcaMedida,
  useMedidaEnElMapa,
} from './useMarcasDelMapa';
import {
  useLineaDelHoyoEnElMapa,
  usePuntosDeLaLinea,
} from './useLineaEnElMapa';
import { useMarcarElHoyo } from './useMarcarElHoyo';
import { useReporteDelHoyo } from './useReporteDelHoyo';
import CabeceraDelMapa from './CabeceraDelMapa';
import IndicacionesDelMapa from './IndicacionesDelMapa';
import RecuadroDeDistancias from './RecuadroDeDistancias';
import PieDelMapa from './PieDelMapa';
import AvisosDelMapa from './AvisosDelMapa';
import BotonesDeMarcar from './BotonesDeMarcar';

// Empaquetado, MapLibre no encuentra solo su worker: va como fichero aparte
setWorkerUrl(urlDelWorker);

/**
 * El mapa del hoyo a pantalla completa (BE #532), sobre la ortofoto del PNOA.
 *
 * Con mapa del hoyo: como se juega (la salida abajo, hacia el green o, en un
 * par 4 o 5, hacia el primer codo) y sin giro con los dedos. El recuadro
 * de delante, centro y fondo es fijo, con los metros oficiales desde la
 * salida (16 oct). Sin mapa: norte arriba, giro libre. Siempre se mide tocando.
 * El GPS va mientras el mapa está abierto, ni antes ni después.
 *
 * La línea del hoyo (la salida, sus codos y el green) se puede mover siempre,
 * para medir. En un hoyo sin línea (17 oct) se pregunta «¿Estás en la salida?»:
 * con un sí y buen GPS, la salida es tu posición (y con un green ya puesto, la
 * línea sale sola); con mal GPS, se toca; con un no, se marca solo el green y
 * se mide desde ti. Lejos del campo o sin permiso de ubicación, sin pregunta: se
 * tocan la salida y el green. Los codos salen ya según el par. El recuadro mide
 * desde ti si el GPS es bueno y estás en el hoyo; si no, con la tarjeta. Al cerrar, si el jugador la hizo o la movió y el
 * hoyo aún recoge muestras (`recoge`), se envía con `onMuestra`, sin decírselo:
 * todo esto es transparente para él (Agustín, 16 oct).
 *
 * En un hoyo con línea, «⋮» reporta un problema (entrega 7, 18 oct): un motivo y
 * la línea que el jugador propone, que se manda con `onReporte`. Mientras, la
 * línea de siempre no se toca: es la que siguen viendo todos.
 *
 * Las piezas, en esta carpeta: el mapa de MapLibre (`useMapaDeMapLibre`), su
 * encuadre (`useEncuadreDelHoyo`), los toques (`useToquesDelMapa`), los
 * marcadores y las líneas (`useMarcasDelMapa`, `useLineaEnElMapa`), el envío de
 * la muestra (`useEnvioAlCerrar`) y lo que se ve encima del mapa.
 */
const MapaDelHoyo = ({
  golfCourseId,
  numeroDeHoyo,
  par,
  hoyo,
  atribucion,
  onCerrar,
  metros = null,
  porMarcar = null,
  recoge = false,
  onMuestra = null,
  onEmpezar = null,
  colocarSalida = true,
  onReporte = null,
}) => {
  const { t } = useTranslation('scoring');
  const conMapa = orientacionDelHoyo(hoyo) !== null;
  const {
    estadoDelGps,
    posicion,
    precision,
    sinUbicacion,
    centroSinMapa,
    referenciaDelCampo,
    comunidad,
    lejos,
    posicionEnElCampo,
    posicionBuena,
  } = useGpsDelHoyo({ golfCourseId, hoyo, conMapa });
  // A mitad de hoyo, el codo de la línea de ti al green (D2): sin tocar, en
  // medio y siguiéndote (`codoSinTocar`); arrastrado, donde se deja (`tocado`)
  const [tocado, setTocado] = useState(null);
  const [codoSinTocar, setCodoSinTocar] = useState(false);
  // Lo que se toca para medir (Agustín, 19 oct): de ti a ese punto, sin el tramo
  // al green; a un búnker, al agua o a la bandera de hoy
  const [medido, setMedido] = useState(null);
  // Hacia dónde se ha orientado el mapa después de abrir (O2-O5): `{ tipo:
  // 'hoyo' }`, o de ti a un punto. Cada cambio gira el mapa una vez
  const [vista, setVista] = useState(null);
  const conVistaRef = useRef(false);
  // Sin WebGL (móviles viejos, o desactivado) no hay mapa, pero el recuadro de
  // la tarjeta sigue, que no lo necesita
  const [sinMapa, setSinMapa] = useState(false);

  const contenedorRef = useRef(null);
  const arribaRef = useRef(null);
  const abajoRef = useRef(null);
  const margen = useCallback(
    () =>
      margenMedido(contenedorRef.current, arribaRef.current, abajoRef.current),
    [],
  );
  const mapaRef = useRef(null);
  const marcaGpsRef = useRef(null);
  const marcaTocadaRef = useRef(null);
  const marcaMedidaRef = useRef(null);
  const marcaDelOrigenRef = useRef(null);
  const centradoEnGpsRef = useRef(false);
  const movidoPorElJugadorRef = useRef(false);
  // La línea al abrir, con la salida llevada a los metros de mi tarjeta (V2, 17
  // oct): la línea es una por hoyo, de la barra que sea. La mía (la que marqué
  // desde este móvil) no se mueve
  const [lineaInicial] = useState(() => {
    const deLaReferencia = lineaParaMover(hoyo, par);
    return colocarSalida
      ? salidaPorMetros(deLaReferencia, metros)
      : deLaReferencia;
  });
  // Lo de la primera vez, sin rehacer el mapa si cambia mientras está abierto.
  // El hoyo, con la salida que se ve: el encuadre la tiene que coger
  const inicioRef = useRef({
    hoyo: lineaInicial && hoyo ? { ...hoyo, playLine: lineaInicial } : hoyo,
    // Como se juega: par 3 al green, par 4 o 5 al primer codo (O1)
    rumbo: rumboDeLaLinea(lineaInicial, par) ?? orientacionDelHoyo(hoyo),
    conMapa,
    centroSinMapa,
    soloGreen: porMarcar === 'green',
    metros,
  });

  const {
    marcandoSalida,
    greenConocido,
    marca,
    setMarca,
    fase,
    pidiendo,
    avisoDeMarca,
    setAvisoDeMarca,
    desdeMi,
    setDesdeMi,
    codoPendiente,
    setCodoPendiente,
    lineaOculta,
    setLineaOculta,
    mitadDecidida,
    setMitadDecidida,
    hastaLaSalida,
    setHastaLaSalida,
    loQueSePideRef,
    reporte,
    setReporte,
    menuDeMotivos,
    gracias,
    setGracias,
    antesDelReporteRef,
    botonDeReportarRef,
    primerMotivoRef,
  } = useEstadoDeLaMarca({ porMarcar, hoyo, lejos, sinUbicacion });
  // La línea que se ve y se mueve; `cambiada`, si el jugador la hizo o la movió.
  // `green`: el que marcó quien no está en la salida (solo green, sin línea)
  const [edicion, setEdicion] = useState(() => ({
    linea: lineaInicial,
    green: null,
    cambiada: false,
    version: 0,
  }));
  const [conAyudaDeCodos, setConAyudaDeCodos] = useState(false);
  const linea = edicion.linea;
  // La salida de la línea que se ve (la de mi barra, o la editada), o la del hoyo:
  // desde ella se mide sin tu posición (T4), y cerca de ella el mapa gira (T6)
  const salidaDelHoyo = (linea ?? hoyo?.playLine)?.[0] ?? null;
  const greenMarcado = edicion.green;
  const {
    hoyoAhora,
    green,
    codoAhora,
    ocultaAhora,
    lineaQueSePinta,
    datosDeLaLinea,
    tocadoAhoraRef,
    delEncuadreRef,
  } = useLineaQueSeVe({
    hoyo,
    par,
    linea,
    greenMarcado,
    posicionBuena,
    desdeMi,
    tocado,
    codoSinTocar,
    medido,
    reporte,
    lineaOculta,
  });
  // El zoom al green, antes que lo del GPS (Z14); acabar una marca vuelve a acercar
  const {
    alGreen,
    sinZoomAlGreen,
    setMarca: setMarcaConZoom,
  } = useAcercarseAlGreen(
    {
      posicionBuena,
      green,
      lejos,
      fase,
      medido,
      reporte,
      lineaInicial,
      salidaDeLaLinea: salidaDelHoyo,
      hoyoAhora,
      par,
    },
    { setVista, setMarca },
  );
  const ultimaLineaRef = useRef(datosDeLaLinea);
  const ultimaMedidaRef = useRef(geojsonDeLaMedida([]));
  const etiquetasDeLaMedidaRef = useRef([]);
  const etiquetasDeLaLineaRef = useRef([]);
  const hoyoActualRef = useRef(
    edicion.linea ? { playLine: [], green: hoyo?.green ?? null } : hoyo,
  );
  const puntosDeLaLineaRef = useRef([]);
  const marcaDeLaSalidaRef = useRef(null);
  // Al cerrar, lo último: se envía al desmontar, se cierre como se cierre
  // (botón, Escape o «atrás»)
  const alCerrarRef = useRef({
    edicion,
    recoge,
    onMuestra,
    campo: referenciaDelCampo,
  });
  const yaEmpezoRef = useRef(false);
  const empezar = useCallback(() => {
    if (yaEmpezoRef.current) return;
    yaEmpezoRef.current = true;
    onEmpezar?.();
  }, [onEmpezar]);

  // El toque: mientras se marca, marca; si no, mide. Por ref, porque el mapa
  // se monta una vez y su oyente vería el estado de entonces
  const alTocarRef = useRef(null);
  const hacerLineaAhoraRef = useRef(null);
  // Se aleja (sin girar) la mitad que los metros de la tarjeta, para buscar el
  // green (16 oct: antes, a los metros enteros, con un anillo)
  const alejarAhoraRef = useRef(null);
  // El doble toque son dos `click` seguidos: el segundo no puede ser el green
  const ultimoToqueRef = useRef(0);
  // La salida del último toque, por si un doble toque corta su alejamiento
  const salidaRecienTocadaRef = useRef(null);
  const enlaceEnteroRef = useRef(null);
  useToquesDelMapa(
    {
      ultimaLineaRef,
      alCerrarRef,
      antesDelReporteRef,
      hacerLineaAhoraRef,
      alejarAhoraRef,
      alTocarRef,
      mapaRef,
      ultimoToqueRef,
      salidaRecienTocadaRef,
    },
    {
      t,
      par,
      metros,
      margen,
      datosDeLaLinea,
      reporte,
      edicion,
      recoge,
      onMuestra,
      referenciaDelCampo,
      fase,
      pidiendo,
      marca,
      marcandoSalida,
      greenConocido,
      hoyo,
      posicionEnElCampo,
      posicionBuena,
      desdeMi,
      salidaDelHoyo,
      empezar,
    },
    {
      setAvisoDeMarca,
      setEdicion,
      setConAyudaDeCodos,
      setMarca: setMarcaConZoom,
      setVista,
      setReporte,
      setGracias,
      setMedido,
      setDesdeMi,
      setCodoPendiente,
    },
  );
  useEnvioAlCerrar(alCerrarRef);
  const { encuadrarHoyo, aplicarVista, ultimaVistaRef } = useEncuadreDelHoyo(
    {
      mapaRef,
      contenedorRef,
      delEncuadreRef,
      inicioRef,
      movidoPorElJugadorRef,
      conVistaRef,
    },
    margen,
    vista,
  );
  const montarMapa = useMapaDeMapLibre(
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
  );
  useMarcaDelGps(
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
  );
  useMarcaDelCodo(
    { mapaRef, marcaTocadaRef },
    { codoAhora, desdeMi, menuDeMotivos, setTocado },
  );
  useMarcaMedida({ mapaRef, marcaMedidaRef }, medido);

  decidirConElGps(
    {
      mitadDecidida,
      reporte,
      green,
      hoyo,
      lineaInicial,
      posicionBuena,
      edicion,
      hastaLaSalida,
      codoPendiente,
      desdeMi,
      lineaOculta,
      tocado,
    },
    {
      setMitadDecidida,
      setLineaOculta,
      setDesdeMi,
      setCodoPendiente,
      setHastaLaSalida,
      setTocado,
      setCodoSinTocar,
      setVista,
    },
    alGreen,
  );
  const textoDeTramo = useCallback(
    (metros) => t('mapa.tramo', { metros }),
    [t],
  );
  // Desde dónde se mide el punto tocado: tu posición si es buena; si no, la
  // salida del hoyo; sin ninguna, del punto al green (T4, 19 oct)
  const origenDeLaMedida = posicionBuena ?? salidaDelHoyo;
  const tramosDelToque = useMemo(() => {
    if (!medido) return [];
    if (origenDeLaMedida) return [[origenDeLaMedida, medido]];
    return green ? [[medido, green.center]] : [];
  }, [medido, origenDeLaMedida, green]);
  // Sin tu posición se mide desde la salida: su punto se marca (`useMarcaDelOrigen`)
  const origenMarcado = medido && !posicionBuena ? origenDeLaMedida : null;
  useMarcaDelOrigen(
    { mapaRef, marcaDelOrigenRef },
    origenMarcado?.lat ?? null,
    origenMarcado?.lon ?? null,
  );
  useMedidaEnElMapa(
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
  );

  // Los metros de cada tramo de la línea que se ve (Agustín, 16 oct: siempre que
  // se pinta una línea). No dependen del GPS: valen lejos del campo y sin señal
  // Reportando, la de siempre no se ve: solo la que se propone
  const lineaVisible = useMemo(
    () =>
      lineaQueSePinta ??
      (reporte || ocultaAhora || medido ? [] : (hoyo?.playLine ?? [])),
    [lineaQueSePinta, hoyo, reporte, ocultaAhora, medido],
  );
  const { cifrasAlArrastrarRef, empezarAlArrastrarRef } =
    useLineaDelHoyoEnElMapa(
      { mapaRef, etiquetasDeLaLineaRef, hoyoActualRef },
      {
        lineaVisible,
        textoDeTramo,
        empezar,
        linea,
        hoyo,
        hoyoAhora,
        greenMarcado,
        reporte,
        medido,
      },
    );

  // La ubicación del campo, si llega después de abrir
  useCentrarEnElCampo(
    {
      mapaRef,
      inicioRef,
      centradoEnGpsRef,
      movidoPorElJugadorRef,
      conVistaRef,
    },
    centroSinMapa,
    lejos,
  );
  const { responder, marcarEntero, ahoraNo, empezarAMarcar } = useMarcarElHoyo(
    {
      enlaceEnteroRef,
      loQueSePideRef,
      salidaRecienTocadaRef,
      hacerLineaAhoraRef,
      alejarAhoraRef,
    },
    { posicionBuena, greenConocido, marcandoSalida, empezar },
    {
      setAvisoDeMarca,
      setMarca: setMarcaConZoom,
      setDesdeMi,
      setCodoPendiente,
      setTocado,
      setCodoSinTocar,
      setMedido,
    },
  );
  const { abrirElMenu, elegirMotivo, acabarElReporte, enviarReporte } =
    useReporteDelHoyo(
      { antesDelReporteRef, primerMotivoRef, botonDeReportarRef },
      {
        t,
        reporte,
        edicion,
        linea,
        tocado,
        codoSinTocar,
        desdeMi,
        onReporte,
        empezar,
      },
      {
        setReporte,
        setEdicion,
        setMedido,
        setGracias,
        setAvisoDeMarca,
        setTocado,
        setCodoSinTocar,
      },
    );
  usePuntosDeLaLinea(
    {
      mapaRef,
      marcaDeLaSalidaRef,
      puntosDeLaLineaRef,
      cifrasAlArrastrarRef,
      empezarAlArrastrarRef,
    },
    {
      salidaQueSePinta: salidaQueSePinta({
        reporte,
        pidiendo,
        marca,
        marcandoSalida,
        hoyo,
      }),
      datosDeLaLinea,
      lineaQueSePinta,
      linea,
      greenMarcado,
      menuDeMotivos,
      setEdicion,
      setConAyudaDeCodos,
    },
  );

  const sePuedeReportar = sePuedeReportarElHoyo({
    onReporte,
    sinMapa,
    hoyo,
    reporte,
    pidiendo,
  });

  const fraseDeLaLinea = useMemo(
    () => fraseDeLosTramos(lineaVisible, t),
    [lineaVisible, t],
  );
  // Desde ti, si el GPS es bueno y estás en el hoyo; si no, la tarjeta
  // (`textosDelRecuadro`)
  const desdeAqui = useMemo(
    () =>
      distanciasDesdeLaPosicion({
        posicion: posicionEnElCampo,
        precision,
        green: hoyoAhora?.green ?? null,
      }),
    [posicionEnElCampo, precision, hoyoAhora],
  );
  const deLaTarjeta = useMemo(
    () => distanciasDelHoyo({ metros, hoyo: hoyoAhora }),
    [metros, hoyoAhora],
  );
  const { distancias, origen: origenDelRecuadro } = textosDelRecuadro({
    t,
    desdeAqui,
    deLaTarjeta,
    metros,
  });
  const { hastaAhi, deAhiAlGreen } = loQueSeAnuncia({
    medido,
    tocado,
    origenDeLaMedida,
    posicionEnElCampo,
    green,
  });
  const aviso = avisoDelGps(estadoDelGps, t);

  return (
    // `ModalShell`: el foco entra (por «Cerrar», lo primero) y vuelve a «Mapa» al
    // cerrar, no se sale con el tabulador, Escape cierra y debajo no se desplaza
    // Escape a mitad de un reporte lo cancela, como su «Cancelar»; si no, cierra
    // el mapa (pasada del Kind, 1 nov 2026: con «⋮» abierto se cerraba todo)
    <ModalShell
      isOpen
      onClose={reporte ? acabarElReporte : onCerrar}
      closeOnBackdrop={false}
      labelledBy="titulo-del-mapa"
      boxClassName="fixed inset-x-0 inset-y-0 bg-black"
    >
      <CabeceraDelMapa
        t={t}
        arribaRef={arribaRef}
        numeroDeHoyo={numeroDeHoyo}
        par={par}
        sePuedeReportar={sePuedeReportar}
        botonDeReportarRef={botonDeReportarRef}
        onReportar={abrirElMenu}
        onCerrar={onCerrar}
      />

      <div ref={montarMapa} className="absolute inset-0" />

      <div
        ref={abajoRef}
        data-testid="mapa-abajo"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]"
      >
        <AvisosDelMapa
          t={t}
          sinMapa={sinMapa}
          aviso={aviso}
          avisoDeMarca={avisoDeMarca}
          gracias={gracias}
          reporte={reporte}
        />

        <IndicacionesDelMapa
          t={t}
          sinMapa={sinMapa}
          reporte={reporte}
          fase={fase}
          pidiendo={pidiendo}
          marca={marca}
          marcandoSalida={marcandoSalida}
          medido={medido}
          desdeMi={desdeMi}
          posicionBuena={posicionBuena}
          aviso={aviso}
          tocado={tocado}
          conAyudaDeCodos={conAyudaDeCodos}
          linea={linea}
          hastaAhi={hastaAhi}
          deAhiAlGreen={deAhiAlGreen}
          primerMotivoRef={primerMotivoRef}
          loQueSePideRef={loQueSePideRef}
          onElegirMotivo={elegirMotivo}
          onAcabarElReporte={acabarElReporte}
          onEnviarReporte={enviarReporte}
          onResponder={responder}
          onAhoraNo={ahoraNo}
          onQuitarMedido={() => setMedido(null)}
          onQuitarTocado={() => setTocado(null)}
        />

        <BotonesDeMarcar
          t={t}
          sinMapa={sinMapa}
          reporte={reporte}
          marca={marca}
          desdeMi={desdeMi}
          marcandoSalida={marcandoSalida}
          pidiendo={pidiendo}
          enlaceEnteroRef={enlaceEnteroRef}
          onMarcarEntero={marcarEntero}
          onEmpezarAMarcar={empezarAMarcar}
        />

        {/* Las cifras de la línea, en una frase, para quien no ve el mapa */}
        {fraseDeLaLinea && (
          <span data-testid="tramos-de-la-linea" className="sr-only">
            {fraseDeLaLinea}
          </span>
        )}
        <RecuadroDeDistancias
          t={t}
          distancias={distancias}
          origen={origenDelRecuadro}
        />

        <PieDelMapa
          t={t}
          comunidad={comunidad}
          atribucion={atribucion}
          sinMapa={sinMapa}
          verHoyo={conMapa || linea}
          enElCampo={posicionEnElCampo}
          onVerHoyo={() => {
            // A mitad de hoyo, vuelve también su línea (H3); y lo último
            // orientado es ya el hoyo, que el panel no vuelva a «desde ti» (CodeRabbit)
            // Tras «Ver hoyo», el mapa ya no se acerca solo al green (Z7)
            setLineaOculta(false);
            sinZoomAlGreen();
            ultimaVistaRef.current = { tipo: 'hoyo' };
            encuadrarHoyo(true);
          }}
          // «Norte» y «Céntrame» también apagan el zoom al green (Z7)
          onNorte={() => {
            sinZoomAlGreen();
            mapaRef.current?.resetNorth();
          }}
          onCentrame={() => {
            sinZoomAlGreen();
            mapaRef.current?.easeTo({ center: lngLat(posicion) });
          }}
        />
      </div>
    </ModalShell>
  );
};

export default MapaDelHoyo;
