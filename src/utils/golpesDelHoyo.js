/**
 * Los golpes de un hoyo de competición: el propio y el del marcado (FE #622,
 * FE #813). Un hoyo puede perder uno y no el otro, así que los avisos de lo que
 * no se guardó, o de lo que el servidor rechazó, dicen cuál.
 */
export const GOLPES_DEL_HOYO = ['ownScore', 'markedScore'];

/**
 * Qué golpes trae una anotación. El que no está (`undefined`) no se anotó; una
 * raya (`null`) sí es un golpe. La misma regla que la cola usa para decidir qué
 * queda sustituido (#609).
 */
export const golpesQueTrae = (scoreData) => GOLPES_DEL_HOYO.filter((g) => scoreData?.[g] !== undefined);
