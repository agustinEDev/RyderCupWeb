import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import {
  rumboDeLaLinea,
  siguientePuntoDeLaLinea,
} from '../../../domain/services/geometriaDelHoyo';
import { hoyoDeUnaMarca } from '../../../domain/services/hoyoMarcado';
import {
  CODO_DESDE_M,
  CODO_HASTA_M,
  FUERA_DE_LA_SALIDA_M,
  enMedio,
  geojsonDeLaLinea,
  mismoPunto,
} from './geometriaDelMapa';

// El hoyo tal y como está ahora: con la línea movida y, si el green no se
// movió, el suyo (con su contorno); si no, delante y fondo a 10 m
const hoyoConLaLinea = (hoyo, linea, greenMarcado) => {
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
};

// Con histéresis: sale a más de 200 m y se va al bajar de 190 (20 oct)
const codoVisible = (alGreen, codoALaVista) =>
  alGreen !== null &&
  (codoALaVista ? alGreen >= CODO_HASTA_M : alGreen > CODO_DESDE_M);

/**
 * La línea que se ve: el hoyo de ahora (con la línea movida), el codo de ti al
 * green, si la línea del hoyo se oculta y lo que se pinta. Deja al día, antes que
 * los efectos del mapa, las dos refs que leen sus oyentes (`tocadoAhoraRef` y
 * `delEncuadreRef`): el mapa se monta una vez y vería el estado de entonces.
 */
export const useLineaQueSeVe = ({
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
}) => {
  const hoyoAhora = useMemo(
    () => hoyoConLaLinea(hoyo, linea, greenMarcado),
    [hoyo, linea, greenMarcado],
  );
  // El codo sin tocar, en medio de ti al green. Solo midiendo desde ti. Sin GPS
  // bueno, a la vista o no, se recuerda (el punto no se ve: no hay línea desde ti)
  const green = hoyoAhora?.green ?? null;
  const centroDelGreen = green?.center ?? null;
  const [codoALaVista, setCodoALaVista] = useState(false);
  const alGreen =
    posicionBuena && centroDelGreen
      ? distanciaEnMetros(posicionBuena, centroDelGreen)
      : null;
  const codoSeVe = codoVisible(alGreen, codoALaVista);
  // Durante el render, como se ajusta un estado a otro en React
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
  const tocadoAhoraRef = useRef(null);
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
  return {
    hoyoAhora,
    green,
    codoAhora,
    ocultaAhora,
    lineaQueSePinta,
    datosDeLaLinea,
    tocadoAhoraRef,
    delEncuadreRef,
  };
};

/**
 * Lo que se decide con el GPS bueno, durante el render (el patrón de React para
 * ajustar un estado a otro, no un efecto): a mitad de un hoyo con línea, la línea
 * desde ti; al llegar a la salida, el hoyo entero; y el codo, una vez.
 */
export const useDecisionesConElGps = (
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
) => {
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
  // pasa de 200 m, C2, C3). Movido no se mueve, y quitado no vuelve (D3, D10)
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
};
