/**
 * El aviso a Sentry de cada vuelta a la anotación tras un arranque en frío (11 nov 2026):
 * para saber cuántas veces cierra iOS la app en el campo y cuánto tiempo.
 *
 * Informativo, sin ids de partida: el tipo de anotación, la pestaña, si el mapa estaba
 * abierto y cuánto estuvo cerrada la app (por tramos en la etiqueta; los minutos, aparte). Del usuario, solo su id, como en
 * todos los eventos. Uno por carga, y nunca lanza: quien llama está arrancando la app.
 */
import { captureError } from './sentryHelpers';

let avisado = false;

/** SOLO para los tests: una carga nueva, sin aviso todavía. */
export const olvidaElAvisoDeLaVuelta = () => {
  avisado = false;
};

// Los minutos cerrada, por tramos: una etiqueta por minuto daría cientos de valores
const tramoDeMinutos = (minutos) => {
  if (minutos < 15) return 'menos de 15';
  if (minutos < 60) return '15 a 60';
  if (minutos < 180) return '1 a 3 h';
  return '3 a 6 h';
};

/** @param {{tipo: string, pestana: string, mapa: boolean, minutos: number}} vuelta */
export const avisaDeLaVueltaALaAnotacion = ({
  tipo,
  pestana,
  mapa,
  minutos,
}) => {
  if (avisado) return;
  avisado = true;
  try {
    captureError('Vuelta a la anotación tras arranque en frío', {
      level: 'info',
      tags: {
        'anotacion.tipo': tipo,
        'anotacion.pestana': pestana,
        'anotacion.mapa': mapa ? 'si' : 'no',
        'anotacion.cerrada': tramoDeMinutos(minutos),
      },
      extra: { minutosCerrada: minutos },
      fingerprint: ['vuelta-a-la-anotacion'],
    });
  } catch {
    // Sin Sentry no hay aviso; la vuelta sigue
  }
};
