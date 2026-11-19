import { useCallback, useState } from 'react';
import {
  encuadreAlGreen,
  tocaAcercarseAlGreen,
} from '../../../domain/services/acercarseAlGreen';
import { vistaAlGreen } from './reglasDelMapa';

/**
 * El zoom al green en los últimos 100 m: una vez por apertura (Z1-Z3) y otra
 * tras cada marca, que gana aunque el mapa se hubiera movido (Agustín, 19 nov).
 * Se decide durante el render, como `decidirConElGps`, y antes que él: le pasa
 * `alGreen` para que ese render no gire el mapa hacia ti (Z14). Cerrar el mapa o
 * cambiar de hoyo lo desmonta y empieza de cero (Z4, Z5).
 *
 * Devuelve también `sinZoomAlGreen` («Ver hoyo», «Norte» y «Céntrame»: ya no se
 * acerca solo, Z7) y `setMarca`, que al acabar una marca vuelve a acercar.
 */
export const useAcercarseAlGreen = (
  {
    posicionBuena,
    green,
    lejos,
    fase,
    medido,
    reporte,
    salida,
    hoyoAhora,
    par,
  },
  { setVista, setMarca },
) => {
  const [zoom, setZoom] = useState({ hecho: false, trasMarcar: false });
  const alGreen = tocaAcercarseAlGreen({
    posicionBuena,
    green,
    lejos,
    yaAcercado: zoom.hecho && !zoom.trasMarcar,
    // Preguntando o pidiendo la salida o el green, se está marcando (Z11)
    marcando: fase === 'pregunta' || fase === 'pidiendo',
    medido,
    reporte,
    salida,
  });
  if (alGreen) {
    setZoom({ hecho: true, trasMarcar: false });
    const encuadre = encuadreAlGreen({
      desde: posicionBuena,
      green,
      linea: hoyoAhora?.playLine ?? null,
      par,
    });
    setVista(vistaAlGreen(encuadre, zoom.trasMarcar));
  } else if (zoom.trasMarcar) {
    // La marca vale para su render: después, el mapa movido vuelve a mandar
    setZoom((z) => ({ ...z, trasMarcar: false }));
  }
  // Una marca acaba cuando su fase vuelve a nada (el hoyo, el green o el «No»)
  const marcarYAcercarse = useCallback(
    (marca) => {
      setMarca(marca);
      if (marca?.fase === null) setZoom((z) => ({ ...z, trasMarcar: true }));
    },
    [setMarca],
  );
  const sinZoomAlGreen = useCallback(
    () => setZoom({ hecho: true, trasMarcar: false }),
    [],
  );
  return { alGreen, sinZoomAlGreen, setMarca: marcarYAcercarse };
};
