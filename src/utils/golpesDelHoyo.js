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

/**
 * Quien marca a dos (fourball con un retirado, 26 oct 2026) tiene dos marcas
 * en el mismo hoyo, y los avisos de lo que no se guardó, o de lo que se
 * rechazó, las nombran con su rival: `markedScore@<id>`. Con un solo nombre,
 * guardar la marca de un rival retiraba el aviso de la del otro, que seguía
 * sin estar en ningún sitio. Con un solo marcado, el nombre de siempre.
 */
export const conSuRival = (golpes, marcado) =>
  golpes.map((g) => (g === 'markedScore' && marcado ? `markedScore@${marcado}` : g));

/** El golpe sin su rival: `markedScore@u4` es un `markedScore`. */
export const golpeBase = (golpe) => golpe.split('@')[0];

/** De qué rival es la marca de un aviso, o `null` si no lo dice. */
export const rivalDe = (golpe) => golpe.split('@')[1] ?? null;

/**
 * A quién marca una anotación de competición: **cada marcado tiene su hueco**
 * (26 oct 2026). En un fourball con un retirado, su pareja marca a los dos
 * rivales, cada uno en su casilla, y la marca de uno no puede pisar la del
 * otro. Sale de la propia anotación y no de la posición del rival en la lista:
 * al retirarse la pareja el orden de los rivales puede cambiar, y con él se
 * pisaban. Partida rápida no lleva marcado: un hueco, como siempre.
 */
export const marcadoDe = (scoreData) => scoreData?.markedPlayerId ?? null;
