/**
 * Con qué nombre se pinta a una persona (FE #435).
 *
 * El servidor ya resuelve «alias si lo hay, nombre completo si no» y manda el
 * resultado en `display_name` (BE #239). Este ayudante NO vuelve a decidirlo:
 * lo lee, y solo cae hacia atrás cuando ese campo no viene, que pasa en tres
 * casos reales:
 *
 * - respuestas guardadas antes de que existiera el campo (una lista de partidas
 *   en el almacenamiento local, por ejemplo),
 * - objetos que arma el propio cliente,
 * - invitados de una partida rápida, que no tienen cuenta ni alias y llevan el
 *   nombre que tecleó quien los añadió.
 *
 * Acepta tanto el DTO de la API (snake_case) como la entidad de dominio
 * (camelCase), porque en esta aplicación conviven las dos formas.
 */
export const nombreVisible = (persona) => {
  if (!persona) return '';

  const yaResuelto = persona.display_name || persona.displayName;
  if (yaResuelto) return yaResuelto;

  const alias = persona.alias;
  if (alias) return alias;

  const nombre = persona.first_name ?? persona.firstName ?? '';
  const apellido = persona.last_name ?? persona.lastName ?? '';
  const completo = `${nombre} ${apellido}`.trim();
  if (completo) return completo;

  // Último recurso: lo que traiga ya compuesto. `name` es lo que usa la
  // partida rápida para sus participantes, invitados incluidos
  return persona.full_name || persona.fullName || persona.name || '';
};

/**
 * El nombre real, para cuando hace falta saber de quién es la cuenta.
 *
 * Devuelve cadena vacía si no se distingue del nombre visible: quien lo llama
 * lo usa para enseñarlo **junto** al alias, y repetir dos veces lo mismo
 * ensucia la pantalla sin aclarar nada.
 */
export const nombreRealSiAporta = (persona) => {
  if (!persona) return '';

  const nombre = persona.first_name ?? persona.firstName ?? '';
  const apellido = persona.last_name ?? persona.lastName ?? '';
  const completo = `${nombre} ${apellido}`.trim();

  return completo && completo !== nombreVisible(persona) ? completo : '';
};
