/**
 * Lo que las dos pantallas de anotación le dicen al jugador cuando falla el
 * móvil, no el servidor (FE #551).
 *
 * Un solo sitio porque son dos pantallas con el mismo caso: cada una tenía su
 * fábrica con una clave distinta para el mismo texto, copiado en cuatro
 * ficheros de traducción. La siguiente corrección se habría aplicado en una
 * copia y no en la otra. Las claves van con espacio de nombres (`scoring:`)
 * para que valgan desde cualquier pantalla, tenga el `t` que tenga.
 */

/**
 * El golpe no se pudo guardar EN EL MÓVIL: sin cobertura y sin sitio donde
 * dejarlo, no existe en ninguna parte. Lleva la clave de su texto, que es lo
 * que la pantalla traduce; sin estado HTTP que mapear salía el genérico
 * «inténtalo de nuevo», que es justo lo que no hay que hacer sin liberar
 * espacio antes.
 */
export const errorDeGuardado = (holeNumber) => {
  const fallo = new Error('No se pudo guardar el golpe en el móvil');
  fallo.holeNumber = holeNumber;
  fallo.noSeGuardo = true;
  fallo.i18nKey = 'scoring:errors.noSeGuardoEnElMovil';
  return fallo;
};

/** El texto del aviso de un vaciado que se paró por el almacenamiento. */
export const claveDelAvisoDelVaciado = (paroPor) => `scoring:errors.vaciado.${paroPor}`;
