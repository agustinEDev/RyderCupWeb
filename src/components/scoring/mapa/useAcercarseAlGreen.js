import { useState } from 'react';
import { tocaAcercarseAlGreen } from '../../../domain/services/acercarseAlGreen';

/**
 * El zoom al green en los últimos 100 m, una vez por apertura del mapa (Z1-Z3):
 * se decide durante el render, como `decidirConElGps`, y después de él, para
 * que gane a la orientación desde ti (Z14). Cerrar el mapa o cambiar de hoyo lo
 * desmonta y empieza de cero (Z4, Z5).
 *
 * Devuelve `sinZoomAlGreen`: tras «Ver hoyo» ya no se acerca solo (Z7).
 */
export const useAcercarseAlGreen = (
  { posicionBuena, green, lejos, fase, medido, reporte },
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
    setVista({ tipo: 'alGreen', desde: posicionBuena, green });
  }
  return () => setYaAcercado(true);
};
