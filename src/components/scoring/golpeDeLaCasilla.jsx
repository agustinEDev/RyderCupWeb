/**
 * Cómo se enseña un golpe de la casilla y qué hueco toca anotar después.
 * Funciones puras, fuera de `HoleInput` para poder probarlas solas.
 */

/**
 * La raya (`null`, bola recogida) se pinta distinta del hoyo sin anotar
 * (`undefined`): los dos llegan sin número y significan lo contrario, y con
 * el mismo guion para ambos solo los distinguía quien usara lector de
 * pantalla. Mismo trazo que `GolfFigure` en la tarjeta, para que la casilla y
 * la tarjeta digan lo mismo.
 *
 * @param {number | null | undefined} valor golpes, `null` = raya, `undefined` = sin anotar
 * @param {(clave: string) => string} t traductor del espacio `scoring`
 * @returns {import('react').ReactNode}
 */
export const pintaGolpe = (valor, t) => {
  // Hoyo sin anotar: hueco, no guion. El guion se confundía con la raya
  // (`null`, bola recogida), que es lo contrario: un hoyo ya cerrado. Se
  // sigue anunciando a quien no lo ve.
  if (valor === undefined) {
    return <span className="sr-only">{t('input.notEntered')}</span>;
  }
  return valor === null ? (
    <span
      aria-label={t('input.pickedUp') || undefined}
      className="text-gray-600"
    >
      —
    </span>
  ) : (
    valor
  );
};

/**
 * El siguiente hueco por anotar: el tuyo antes que el del rival (FE #725).
 * La raya ya es un golpe anotado; solo cuenta lo que se puede tocar.
 *
 * @param {{
 *   propioBloqueado: boolean,
 *   propio: number | null | undefined,
 *   marcadoBloqueado: boolean,
 *   marcado: number | null | undefined,
 *   haySegundo: boolean,
 *   segundoBloqueado: boolean,
 *   segundo: number | null | undefined,
 * }} casillas
 * @returns {'own' | 'marked' | 'second' | null}
 */
export const siguienteHueco = ({
  propioBloqueado,
  propio,
  marcadoBloqueado,
  marcado,
  haySegundo,
  segundoBloqueado,
  segundo,
}) => {
  if (!propioBloqueado && propio === undefined) return 'own';
  if (!marcadoBloqueado && marcado === undefined) return 'marked';
  if (haySegundo && !segundoBloqueado && segundo === undefined) return 'second';
  return null;
};
