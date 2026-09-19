/**
 * Qué campos de una competición hay que arrancar a mano (FE #630).
 *
 * La anotación de un partido abre sola a la hora de su sesión, en la hora LOCAL
 * del campo (BE #305). Esa hora se deduce de las coordenadas, así que un campo
 * sin coordenadas no tiene zona y **no abre solo**: alguien tiene que pulsar
 * START, y para eso hace falta cobertura. Si nadie lo hace, todos los golpes de
 * esa vuelta vuelven rechazados, que es justo lo que la BE #305 existe para
 * evitar.
 *
 * Por eso se dice ANTES, en la pantalla de la competición: para que quien
 * conduce hasta un campo sin señal lo sepa en casa, no en el tee del 1.
 *
 * Ojo a las dos ausencias, que no son la misma:
 *
 *   - `timezone: null` — el servidor lo ha mirado y ese campo no tiene zona.
 *     Se avisa.
 *   - sin `timezone` — lo mandó un servidor anterior a la BE #305, o son datos
 *     guardados de entonces. No se sabe, y no se avisa: una falsa alarma manda
 *     a pulsar START sin necesidad y siembra dudas sobre campos que sí abren.
 *
 * El alcance es el CAMPO: «este no abre solo, nunca». Que una ronda concreta no
 * abra por otro motivo —le falta la sesión, por ejemplo— es harina de otro
 * costal y se vería en el calendario, que es donde viven las rondas; aquí solo
 * hay campos. Por eso se mira `timezone` y no el `scoringOpensAt` de una ronda.
 */
export const hayQueArrancarloAMano = (campo) => (
  Boolean(campo) && 'timezone' in campo && campo.timezone === null
);
