import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';

/**
 * Las cifras del recuadro y de dónde salen: desde ti, si el GPS es bueno y estás
 * en el hoyo (Agustín, 17 oct); si no, con los metros de tu barra (la tarjeta);
 * sin ellos, con la línea como está ahora (la salida).
 */
export const textosDelRecuadro = ({ t, desdeAqui, deLaTarjeta, metros }) => {
  if (desdeAqui)
    return { distancias: desdeAqui, origen: t('mapa.desdeTuPosicion') };
  return {
    distancias: deLaTarjeta,
    origen: t(metros ? 'mapa.desdeTuBarra' : 'mapa.desdeLaSalida'),
  };
};

/**
 * Lo que se anuncia: del punto tocado (T8) o, sin él, del codo de la línea al
 * green. Midiendo desde un origen (tu posición o la salida), sin el tramo al green.
 */
export const loQueSeAnuncia = ({
  medido,
  tocado,
  origenDeLaMedida,
  posicionEnElCampo,
  green,
}) => {
  const [haciaAhi, deDondeAhi] = medido
    ? [medido, origenDeLaMedida]
    : [tocado, posicionEnElCampo];
  const hastaAhi =
    haciaAhi && deDondeAhi ? distanciaEnMetros(deDondeAhi, haciaAhi) : null;
  const deAhiAlGreen =
    haciaAhi && green && !(medido && origenDeLaMedida)
      ? distanciaEnMetros(haciaAhi, green.center)
      : null;
  return { hastaAhi, deAhiAlGreen };
};

/** El aviso del GPS mientras no hay posición; listo, ninguno (`undefined`). */
export const avisoDelGps = (estadoDelGps, t) =>
  ({
    buscando: t('mapa.buscando'),
    denegado: t('mapa.denegado'),
    'no-disponible': t('mapa.noDisponible'),
  })[estadoDelGps];
