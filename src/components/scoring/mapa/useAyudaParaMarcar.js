import { useRef, useState } from 'react';
import { useGuiaParaMarcarVista } from '../../../hooks/useGuiaParaMarcarVista';
import { pasoDeLaMarca, seVeLaGuia } from './ayudaParaMarcar';

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
}) => {
  const { vista, marcarVista } = useGuiaParaMarcarVista(userId);
  const [pedida, setPedida] = useState(false);
  // El «?» de lo que se ve ahora (uno solo a la vez): al cerrar, el foco vuelve
  // a él, también si la guía salió sola (B2)
  const botonDeAyudaRef = useRef(null);
  const cerrarGuia = () => {
    marcarVista();
    setPedida(false);
    botonDeAyudaRef.current?.focus();
  };
  return {
    guiaAbierta: seVeLaGuia({ fase, sinMapa, reporte, vista, pedida }),
    abrirGuia: () => setPedida(true),
    cerrarGuia,
    botonDeAyudaRef,
    paso: pasoDeLaMarca({
      pidiendo,
      marca,
      marcandoSalida,
      // El que trae el hoyo o el recién tocado tras el «No»
      greenYaPuesto: greenConocido ?? greenMarcado,
      par,
    }),
  };
};
