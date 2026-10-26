/**
 * Los golpes de un hoyo de competición: el propio y el del marcado (FE #622,
 * FE #813). Un hoyo puede perder uno y no el otro, así que los avisos de lo que
 * no se guardó, o de lo que el servidor rechazó, dicen cuál.
 */
export const GOLPES_DEL_HOYO = ['ownScore', 'markedScore', 'secondMarkedScore'];

/**
 * El nombre de un golpe en su hueco de la cola. Quien marca a dos (fourball con
 * un retirado, 26 oct 2026) manda la marca del segundo rival en su propio hueco
 * y con el mismo campo, `markedScore`; en los avisos es otro golpe,
 * `secondMarkedScore`. Con un solo nombre, guardar la marca de un rival
 * retiraba el aviso de la del otro, que seguía sin estar en ningún sitio.
 */
export const enSuHueco = (golpes, marcado = null) =>
  marcado ? golpes.map((g) => (g === 'markedScore' ? 'secondMarkedScore' : g)) : golpes;

/**
 * Qué golpes trae una anotación. El que no está (`undefined`) no se anotó; una
 * raya (`null`) sí es un golpe. La misma regla que la cola usa para decidir qué
 * queda sustituido (#609).
 */
export const golpesQueTrae = (scoreData, marcado = null) =>
  enSuHueco(['ownScore', 'markedScore'].filter((g) => scoreData?.[g] !== undefined), marcado);
