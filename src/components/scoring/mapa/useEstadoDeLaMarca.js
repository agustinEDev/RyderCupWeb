import { useRef, useState } from 'react';

// La primera fase: sin salida, se pregunta; con salida, se pide el green
const faseInicial = (marcandoSalida, porMarcar) => {
  if (marcandoSalida) return 'pregunta';
  return porMarcar ? 'pidiendo' : null;
};

/**
 * La salida que se pinta mientras se pide el green: la recién tocada o, pidiendo
 * solo el green, la aprobada (para ver desde dónde se mide). Reportando, la que
 * se propone.
 */
export const salidaQueSePinta = ({
  reporte,
  pidiendo,
  marca,
  marcandoSalida,
  hoyo,
}) => {
  if (reporte?.fase === 'green') return reporte.tee;
  if (!pidiendo) return null;
  return marca.tee ?? (marcandoSalida ? null : (hoyo?.playLine?.[0] ?? null));
};

// «⋮», solo en un hoyo con línea y sin marcar otra cosa (la pregunta de la
// salida solo sale en un hoyo sin línea)
export const sePuedeReportar = ({
  onReporte,
  sinMapa,
  hoyo,
  reporte,
  pidiendo,
}) =>
  Boolean(onReporte) &&
  !sinMapa &&
  (hoyo?.playLine?.length ?? 0) >= 2 &&
  !reporte &&
  !pidiendo;

/**
 * El estado de marcar el hoyo y de reportarlo: en qué fase va la marca, el aviso,
 * si se mide desde ti (tras el «No» o a mitad de hoyo), lo que se decide con el
 * primer GPS bueno y el reporte en curso. Solo estado: lo que hacen los botones
 * vive en `useMarcarElHoyo` y `useReporteDelHoyo`.
 */
export const useEstadoDeLaMarca = ({
  porMarcar,
  hoyo,
  lejos,
  sinUbicacion,
}) => {
  // Marcar el hoyo: sin salida, primero se pregunta si estás en ella (17 oct);
  // con salida, se pide el green. «Ahora no» deja medir como siempre
  const marcandoSalida =
    porMarcar === 'salida' || porMarcar === 'salidaAlGreen';
  const [marca, setMarca] = useState({
    fase: faseInicial(marcandoSalida, porMarcar),
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
  const antesDelReporteRef = useRef(null);
  const botonDeReportarRef = useRef(null);
  const primerMotivoRef = useRef(null);
  // El green que ya trae el hoyo (de una muestra solo green): con la salida basta
  const greenConocido =
    porMarcar === 'salidaAlGreen' ? (hoyo?.green?.center ?? null) : null;
  // Lejos del campo o sin ubicación no se pregunta: se toca la salida (L1, 17 oct)
  const fase =
    marca.fase === 'pregunta' && (lejos || sinUbicacion)
      ? 'pidiendo'
      : marca.fase;
  return {
    marcandoSalida,
    greenConocido,
    marca,
    setMarca,
    fase,
    pidiendo: fase === 'pidiendo',
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
    menuDeMotivos: reporte?.fase === 'motivos',
    gracias,
    setGracias,
    antesDelReporteRef,
    botonDeReportarRef,
    primerMotivoRef,
  };
};
