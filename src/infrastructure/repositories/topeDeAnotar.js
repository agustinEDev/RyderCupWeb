/**
 * El tope de tiempo de las llamadas de anotar (FE #624): los envíos de golpes,
 * entregar la tarjeta, conceder y la vista del partido que se sondea.
 *
 * Con mala cobertura un `fetch` no falla: no contesta. Y en anotación se
 * escribe de uno en uno a propósito, así que un envío colgado retenía en el
 * móvil todos los golpes de después. El mismo que el del refresco del token.
 *
 * Solo aquí, y no en todas las peticiones: las demás esperan a servicios
 * externos lentos —la RFEG, el correo— y un corte las daría por fallidas
 * cuando el servidor sí las termina.
 */
export const TOPE_DE_ANOTAR_MS = 15000;
