import es from '../../../i18n/locales/es/schedule.json';

/**
 * Para los `t` falsos de los tests: las abreviaturas del hándicap («HCP +2.0»,
 * «PH: 18 Lim.») salen del español de verdad, con su hueco relleno, porque lo
 * que se comprueba es el texto que se lee. Cualquier otra clave da `undefined`
 * y cada test sigue con lo suyo.
 */
export const abreviaturaDeHandicap = (clave, params = {}) => {
  if (!clave.startsWith('handicapLabels.')) return undefined;
  const plantilla = es.handicapLabels?.[clave.slice('handicapLabels.'.length)];
  return plantilla?.replace(/{{(\w+)}}/g, (_, hueco) => String(params[hueco]));
};
