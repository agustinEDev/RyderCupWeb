import { useState } from 'react';
import {
  tocaAcercarseAlGreen,
  vistaAlGreen,
} from '../../../domain/services/acercarseAlGreen';

/**
 * La vista si acaba de cambiar (en este render o en los que React encadena
 * antes de pintar), o `null` si ya estaba: lo que se pidió ahora, no lo que se
 * aplicó hace rato. Con el patrón de React de guardar el valor anterior.
 */
export const useVistaRecienPedida = (vista) => {
  const [anterior, setAnterior] = useState(vista);
  if (vista === anterior) return null;
  setAnterior(vista);
  return vista;
};

/**
 * El zoom al green en los últimos 100 m, una vez por apertura del mapa (Z1-Z3):
 * se decide durante el render, como `decidirConElGps`, y después de él, para
 * que gane a la orientación desde ti (Z14). Cerrar el mapa o cambiar de hoyo lo
 * desmonta y empieza de cero (Z4, Z5).
 *
 * Devuelve `sinZoomAlGreen`: tras «Ver hoyo» ya no se acerca solo (Z7).
 */
export const useAcercarseAlGreen = (
  { posicionBuena, green, lejos, fase, medido, reporte, vistaRecien },
  setVista,
) => {
  const [yaAcercado, setYaAcercado] = useState(false);
  // Preguntando o pidiendo la salida o el green, se está marcando (Z11)
  const marcando = fase === 'pregunta' || fase === 'pidiendo';
  if (
    tocaAcercarseAlGreen({
      posicionBuena,
      green,
      lejos,
      yaAcercado,
      marcando,
      medido,
      reporte,
    })
  ) {
    setYaAcercado(true);
    // Tras marcar, gana el zoom aunque el mapa se hubiera movido (19 nov)
    setVista(vistaAlGreen(posicionBuena, green, vistaRecien));
  }
  return () => setYaAcercado(true);
};
