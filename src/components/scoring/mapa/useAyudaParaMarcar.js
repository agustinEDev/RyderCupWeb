import { useEffect, useRef, useState } from 'react';
import { useGuiaParaMarcarVista } from '../../../hooks/useGuiaParaMarcarVista';
import { codosDelPar } from '../../../domain/services/hoyoMarcado';
import {
  habraPuntosQueArrastrar,
  pasoDeLaMarca,
  seVeLaGuia,
} from './ayudaParaMarcar';

// Enfocar sin desplazar la pantalla, como `useFocoRetenido`
const SIN_DESPLAZAR = { preventScroll: true };

/**
 * La ayuda para marcar un hoyo sin datos (Agustín, 19 nov): la guía (sola la
 * primera vez, o con el «?») y el «Paso N de M» de lo que se pide. No toca el
 * flujo de marcar: cerrar la guía deja la fase donde estaba (G3).
 */
export const useAyudaParaMarcar = ({
  userId,
  fase,
  pidiendo,
  sinMapa,
  reporte,
  marca,
  marcandoSalida,
  greenConocido,
  greenMarcado,
  par,
  hoyo,
  setConAyudaDeCodos,
}) => {
  const { vista, marcarVista } = useGuiaParaMarcarVista(userId);
  const [pedida, setPedida] = useState(false);
  // El «?» de lo que se ve ahora (uno solo a la vez): al cerrar, el foco vuelve
  // a él, también si la guía salió sola (B2)
  const botonDeAyudaRef = useRef(null);
  const cerrarGuia = () => {
    marcarVista();
    setPedida(false);
    botonDeAyudaRef.current?.focus(SIN_DESPLAZAR);
  };
  // «Listo» se va con la placa: el foco pasa a lo que queda en su sitio (la
  // ayuda de medir), para que no caiga al body
  const [listo, setListo] = useState(0);
  const trasListoRef = useRef(null);
  useEffect(() => {
    if (listo) trasListoRef.current?.focus(SIN_DESPLAZAR);
  }, [listo]);
  const alListo = () => {
    setConAyudaDeCodos(false);
    setListo((n) => n + 1);
  };
  const lineaAprobada = hoyo?.playLine ?? [];
  // Falta solo el green: el hoyo ya tiene salida, o se contestó «No»
  const soloGreen = !marcandoSalida || marca.soloGreen === true;
  return {
    guiaAbierta: seVeLaGuia({ fase, sinMapa, reporte, vista, pedida }),
    abrirGuia: () => setPedida(true),
    cerrarGuia,
    botonDeAyudaRef,
    alListo,
    trasListoRef,
    // Con la salida ya puesta, la guía del green (Agustín, 19 nov)
    soloGreen,
    // La curva, si habrá puntos que arrastrar: en el hoyo entero, los codos del
    // par; solo el green, lo que se sabe seguro (como el «Paso N de M»)
    conCurva: soloGreen
      ? habraPuntosQueArrastrar(lineaAprobada, par)
      : codosDelPar(par) > 0,
    paso: pasoDeLaMarca({
      pidiendo,
      marca,
      marcandoSalida,
      // El que trae el hoyo o el recién tocado tras el «No»
      greenYaPuesto: greenConocido ?? greenMarcado,
      par,
      // La línea aprobada: si ya trae sus codos, no habrá placa del último paso
      lineaAprobada,
    }),
  };
};
