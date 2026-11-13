import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import './mapa.css';
import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import {
  PRECISION_PARA_MEDIR_M,
  distanciasDelHoyo,
  distanciasDesdeLaPosicion,
} from '../../../domain/services/distanciasDelHoyo';
import {
  orientacionDelHoyo,
  rumboDeLaLinea,
  siguientePuntoDeLaLinea,
} from '../../../domain/services/geometriaDelHoyo';
import {
  estaLejosDelCampo,
  hoyoDeUnaMarca,
  salidaPorMetros,
} from '../../../domain/services/hoyoMarcado';
import { usePosicionGps } from '../../../hooks/usePosicionGps';
import { comunidadDelPunto } from '../../../domain/services/comunidadDelCampo';
import { useCentroSinMapa } from '../../../hooks/useCentroSinMapa';
import ModalShell from '../../ui/ModalShell';
import { BOTON, PLACA } from './clasesDelMapa';
import {
  CODO_DESDE_M,
  CODO_HASTA_M,
  FUERA_DE_LA_SALIDA_M,
  enMedio,
  fraseDeLaLinea as fraseDeLosTramos,
  geojsonDeLaLinea,
  geojsonDeLaMedida,
  lineaParaMover,
  lngLat,
  mismoPunto,
} from './geometriaDelMapa';
import { margenMedido } from './margenDelMapa';
import { useToquesDelMapa } from './useToquesDelMapa';
import { useEnvioAlCerrar } from './useEnvioAlCerrar';
import { useEncuadreDelHoyo } from './useEncuadreDelHoyo';
import { useMapaDeMapLibre } from './useMapaDeMapLibre';
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
  const gps = usePosicionGps({ activo: true });
  const posicion = gps.estado === 'listo' ? gps.posicion : null;
  const precision = gps.estado === 'listo' ? (gps.precision ?? null) : null;
  // Sin permiso o sin GPS en el móvil, no hay posición que preguntar
  const sinUbicacion =
    gps.estado === 'denegado' || gps.estado === 'no-disponible';
  const centroSinMapa = useCentroSinMapa({ golfCourseId, activo: !conMapa });
  // Si estás en el campo: si el hoyo tiene salida (aunque no tenga green), se
  // mide desde ella; si no, desde la ubicación del campo (sin ninguna de las
  // dos, se da por hecho que sí)
  const referenciaDelCampo =
    hoyo?.playLine?.[0] ?? centroSinMapa ?? hoyo?.green?.center ?? null;
  // Lejos (no estás jugando): el mapa no se va a tu casa, no se mide desde ti
  // y «Céntrame» no se puede pulsar (16 oct)
  // Con ortofoto de su comunidad, más reciente que la PNOA, si la hay (19 oct)
  // Solo cuando cambia la posición, no en cada aviso del GPS (/code-review)
  const latDelCampo = referenciaDelCampo?.lat ?? null;
  const lonDelCampo = referenciaDelCampo?.lon ?? null;
  const comunidad = useMemo(
    () =>
      comunidadDelPunto(
        latDelCampo === null || lonDelCampo === null
          ? null
          : { lat: latDelCampo, lon: lonDelCampo },
      ),
    [latDelCampo, lonDelCampo],
  );
  const lejos = estaLejosDelCampo(posicion, referenciaDelCampo);
  const posicionEnElCampo = lejos ? null : posicion;
  // La que vale para medir desde ti: en el campo y con el GPS bueno
  const posicionBuena =
    posicionEnElCampo &&
    precision !== null &&
    precision <= PRECISION_PARA_MEDIR_M
      ? posicionEnElCampo
      : null;
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
  const tocadoAhoraRef = useRef(null);
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

  // Marcar el hoyo: sin salida, primero se pregunta si estás en ella (17 oct);
  // con salida, se pide el green. «Ahora no» deja medir como siempre
  const preguntaPrimero =
    porMarcar === 'salida' || porMarcar === 'salidaAlGreen';
  const [marca, setMarca] = useState({
    fase: preguntaPrimero ? 'pregunta' : porMarcar ? 'pidiendo' : null,
    tee: null,
  });
  const [avisoDeMarca, setAvisoDeMarca] = useState(null);
  // «No» a «¿Estás en la salida?»: de ti al green, con el codo en medio si pasa
  // de 200 m (Agustín, 18 oct; sin tocar, te sigue: 20 oct). Nada de esto es una
  // muestra
  const [desdeMi, setDesdeMi] = useState(false);
  const [codoPendiente, setCodoPendiente] = useState(false);
  // En un hoyo con línea, abierto a mitad de hoyo: la línea se oculta hasta
  // «Ver hoyo» (H1, H3). Se decide una vez, con el primer GPS bueno (H4, H5)
  const [lineaOculta, setLineaOculta] = useState(false);
  const [mitadDecidida, setMitadDecidida] = useState(false);
  const [hastaLaSalida, setHastaLaSalida] = useState(false);
  const loQueSePideRef = useRef(null);
  // El reporte en curso (entrega 7): eligiendo el motivo, tocando la salida, el
  // green, o con la propuesta lista. Lo que había antes se guarda para volver a
  // ello: la propuesta no es una muestra
  const [reporte, setReporte] = useState(null);
  const [gracias, setGracias] = useState(false);
  const menuDeMotivos = reporte?.fase === 'motivos';
  const antesDelReporteRef = useRef(null);
  const botonDeReportarRef = useRef(null);
  const primerMotivoRef = useRef(null);
  const marcandoSalida = preguntaPrimero;
  // El green que ya trae el hoyo (de una muestra solo green): con la salida basta
  const greenConocido =
    porMarcar === 'salidaAlGreen' ? (hoyo?.green?.center ?? null) : null;
  // Lejos del campo o sin ubicación no se pregunta: se toca la salida (L1, 17 oct)
  const fase =
    marca.fase === 'pregunta' && (lejos || sinUbicacion)
      ? 'pidiendo'
      : marca.fase;
  const pidiendo = fase === 'pidiendo';
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
  // El hoyo tal y como está ahora: con la línea movida y, si el green no se
  // movió, el suyo (con su contorno); si no, delante y fondo a 10 m
  const greenMarcado = edicion.green;
  const hoyoAhora = useMemo(() => {
    if (!linea)
      return greenMarcado
        ? { playLine: [], green: { center: greenMarcado } }
        : hoyo;
    if (hoyo?.green && mismoPunto(hoyo.green.center, linea.at(-1)))
      return { ...hoyo, playLine: linea };
    return hoyoDeUnaMarca({
      tee: linea[0],
      bends: linea.slice(1, -1),
      greenCenter: linea.at(-1),
    });
  }, [hoyo, linea, greenMarcado]);
  // El codo sin tocar, en medio de ti al green: sale a más de 200 m y se va al
  // bajar de 190 (Agustín, 20 oct). Solo midiendo desde ti. Sin GPS bueno, a la
  // vista o no, se recuerda (el punto no se ve: no hay línea desde ti)
  const green = hoyoAhora?.green ?? null;
  const centroDelGreen = green?.center ?? null;
  const [codoALaVista, setCodoALaVista] = useState(false);
  const alGreen =
    posicionBuena && centroDelGreen
      ? distanciaEnMetros(posicionBuena, centroDelGreen)
      : null;
  const codoSeVe =
    alGreen !== null &&
    (codoALaVista ? alGreen >= CODO_HASTA_M : alGreen > CODO_DESDE_M);
  if (alGreen !== null && codoSeVe !== codoALaVista) setCodoALaVista(codoSeVe);
  const codoEnMedio = useMemo(
    () =>
      desdeMi && !tocado && codoSinTocar && codoSeVe
        ? enMedio(posicionBuena, centroDelGreen)
        : null,
    [desdeMi, tocado, codoSinTocar, codoSeVe, posicionBuena, centroDelGreen],
  );
  // Con un punto tocado, solo la línea de ti a él: la de ti al green y su codo
  // se esconden, y «Quitar» los devuelve como estaban (M1, Agustín, 24 oct)
  const codoAhora = medido ? null : (tocado ?? codoEnMedio);
  useLayoutEffect(() => {
    // El codo sin tocar cuenta mientras está a la vista, también con el GPS
    // flojo, que no lo pinta (/code-review)
    tocadoAhoraRef.current =
      medido ?? tocado ?? ((desdeMi && codoSinTocar && codoALaVista) || null);
  }, [medido, tocado, desdeMi, codoSinTocar, codoALaVista]);
  // Lo que encuadra «Ver hoyo»: la línea de ahora con su rumbo (O5, O7)
  const delEncuadreRef = useRef(null);
  useLayoutEffect(() => {
    // Proponiendo un reporte, la de al abrir, no la propuesta (O9)
    delEncuadreRef.current =
      linea && hoyoAhora && !reporte
        ? { hoyo: hoyoAhora, rumbo: rumboDeLaLinea(linea, par) }
        : null;
  });
  // Sin un GPS bueno no hay línea desde ti: mientras dure, la del hoyo (H14)
  const ocultaAhora = lineaOculta && !reporte && !!posicionBuena;
  // Con un punto tocado, la línea del hoyo se va entera: solo la tuya al punto
  // (Agustín, 19 oct, en el móvil: las dos a la vez se pisaban); «Quitar» la trae
  const lineaQueSePinta = ocultaAhora || medido ? null : linea;
  const datosDeLaLinea = useMemo(
    () => geojsonDeLaLinea(lineaQueSePinta ?? []),
    [lineaQueSePinta],
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
      setMarca,
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

  // A mitad de un hoyo con línea y green: la línea desde ti, sin preguntar (H1, H2)
  const salidaDeMiBarra = lineaInicial?.[0] ?? null;
  // Con el «⋮» abierto se espera a cerrarlo: no se pinta nada sobre la línea que se propone (revisor, 18 oct)
  if (
    !mitadDecidida &&
    !reporte &&
    green &&
    (hoyo?.playLine?.length ?? 0) >= 2 &&
    salidaDeMiBarra &&
    posicionBuena
  ) {
    setMitadDecidida(true);
    // Con la línea ya movida se queda el hoyo entero, con lo editado (H13)
    if (
      !edicion.cambiada &&
      distanciaEnMetros(posicionBuena, salidaDeMiBarra) > FUERA_DE_LA_SALIDA_M
    ) {
      setLineaOculta(true);
      setDesdeMi(true);
      setCodoPendiente(true);
      setHastaLaSalida(true);
    }
  }
  // Ibas hacia la salida: al llegar, el hoyo entero, una vez (H12)
  // Proponiendo un reporte se espera a acabarlo: no gira (O9)
  if (
    hastaLaSalida &&
    !reporte &&
    posicionBuena &&
    distanciaEnMetros(posicionBuena, salidaDeMiBarra) <= FUERA_DE_LA_SALIDA_M
  ) {
    setHastaLaSalida(false);
    setLineaOculta(false);
    setDesdeMi(false);
    setTocado(null);
    setCodoSinTocar(false);
    setVista({ tipo: 'hoyo' });
  }
  // El codo, una vez: con el primer GPS bueno, sin tocar (te sigue en medio si
  // pasa de 200 m, C2, C3). Movido no se mueve, y quitado no vuelve (D3, D10).
  // Durante el render, como se ajusta un estado a otro en React
  if (codoPendiente && desdeMi && posicionBuena && green) {
    setCodoPendiente(false);
    // Hacia el siguiente punto de la línea del hoyo, o al green sin ella (O2, O4)
    const hacia =
      (lineaOculta && siguientePuntoDeLaLinea(posicionBuena, lineaInicial)) ||
      green.center;
    setVista({
      tipo: 'desdeMi',
      desde: posicionBuena,
      hacia,
      green: green.center,
    });
    // Tocar mide (19 oct): el codo sale siempre en medio, y uno que ya hubiera se queda
    if (!tocado) setCodoSinTocar(true);
  }
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
    { posicionBuena, greenConocido, preguntaPrimero, empezar },
    {
      setAvisoDeMarca,
      setMarca,
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
  // La salida mientras se pide el green: la recién tocada o, pidiendo solo el
  // green, la aprobada (para ver desde dónde se mide)
  const salidaQueSePinta =
    reporte?.fase === 'green'
      ? reporte.tee
      : pidiendo
        ? (marca.tee ?? (marcandoSalida ? null : (hoyo?.playLine?.[0] ?? null)))
        : null;
  usePuntosDeLaLinea(
    {
      mapaRef,
      marcaDeLaSalidaRef,
      puntosDeLaLineaRef,
      cifrasAlArrastrarRef,
      empezarAlArrastrarRef,
    },
    {
      salidaQueSePinta,
      datosDeLaLinea,
      lineaQueSePinta,
      linea,
      greenMarcado,
      menuDeMotivos,
      setEdicion,
      setConAyudaDeCodos,
    },
  );

  // «⋮», solo en un hoyo con línea y sin marcar otra cosa (la pregunta de la
  // salida solo sale en un hoyo sin línea)
  const sePuedeReportar =
    Boolean(onReporte) &&
    !sinMapa &&
    (hoyo?.playLine?.length ?? 0) >= 2 &&
    !reporte &&
    !pidiendo;

  const fraseDeLaLinea = useMemo(
    () => fraseDeLosTramos(lineaVisible, t),
    [lineaVisible, t],
  );
  // Desde ti, si el GPS es bueno y estás en el hoyo (Agustín, 17 oct); si no,
  // con los metros de tu barra (sin ellos, la línea como está ahora)
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
  const distancias = desdeAqui ?? deLaTarjeta;
  // De dónde salen las cifras: tu posición, tu barra (la tarjeta) o la salida (la línea)
  const origenDelRecuadro = t(
    desdeAqui
      ? 'mapa.desdeTuPosicion'
      : metros
        ? 'mapa.desdeTuBarra'
        : 'mapa.desdeLaSalida',
  );
  // Lo que se anuncia: del punto tocado (T8) o, sin él, del codo de la línea al green
  const [haciaAhi, deDondeAhi] = medido
    ? [medido, origenDeLaMedida]
    : [tocado, posicionEnElCampo];
  const hastaAhi =
    haciaAhi && deDondeAhi ? distanciaEnMetros(deDondeAhi, haciaAhi) : null;
  const deAhiAlGreen =
    haciaAhi && green && !(medido && origenDeLaMedida)
      ? distanciaEnMetros(haciaAhi, green.center)
      : null;
  const aviso = {
    buscando: t('mapa.buscando'),
    denegado: t('mapa.denegado'),
    'no-disponible': t('mapa.noDisponible'),
  }[gps.estado];

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
        {sinMapa && (
          <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>
            {t('mapa.sinMapaEnEsteMovil')}
          </p>
        )}
        {aviso && (
          <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{aviso}</p>
        )}

        {avisoDeMarca && (
          <p
            role="alert"
            className={`${PLACA} self-start px-3.5 py-2 text-sm text-yellow-300`}
          >
            {avisoDeMarca}
          </p>
        )}

        {/* Siempre montado, para que el lector de pantalla diga las gracias */}
        <div aria-live="polite" className="contents">
          {gracias && !reporte && (
            <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>
              {t('mapa.reporteGracias')}
            </p>
          )}
        </div>

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

        {/* Tras el «No», por si quiere marcarlo igualmente (D1, D6, D8) */}
        {((desdeMi && preguntaPrimero) || (pidiendo && marca.soloGreen)) &&
          !reporte && (
            <button
              ref={enlaceEnteroRef}
              type="button"
              onClick={marcarEntero}
              className="pointer-events-auto min-h-11 self-end px-2 text-sm font-semibold text-white underline [text-shadow:0_1px_2px_#000]"
            >
              {t('mapa.marcarEntero')}
            </button>
          )}

        {marca.fase === 'pausado' && !sinMapa && !reporte && (
          <button
            type="button"
            onClick={empezarAMarcar}
            className={`${BOTON} pointer-events-auto self-end`}
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {t('mapa.marcarHoyo')}
          </button>
        )}

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
            setLineaOculta(false);
            ultimaVistaRef.current = { tipo: 'hoyo' };
            encuadrarHoyo(true);
          }}
          onNorte={() => mapaRef.current?.resetNorth()}
          onCentrame={() =>
            mapaRef.current?.easeTo({ center: lngLat(posicion) })
          }
        />
      </div>
    </ModalShell>
  );
};

export default MapaDelHoyo;
