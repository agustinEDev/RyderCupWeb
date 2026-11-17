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

/**
 * El otro nombre, el que va pequeño debajo del que se pinta delante (SB-08).
 *
 * El alias es el apodo con el que te conocen tus amigos, no un dato oculto
 * (Agustín, 17 nov 2026): donde se pinta el alias, el nombre real va debajo; donde
 * va el nombre real (las competiciones públicas), el alias. Quien no tiene alias
 * solo tiene un nombre, y aquí no sale nada. Tampoco si los dos coinciden.
 */
export const nombrePequeno = (persona) => {
  if (!persona?.alias) return '';

  const delante = nombreVisible(persona);
  if (delante === persona.alias) return nombreRealSiAporta(persona);
  // Delante, el nombre real: debajo, el alias. Si delante va otra cosa (un nombre
  // guardado de antes de que cambiara su alias), mejor nada que dos alias
  const nombre = persona.first_name ?? persona.firstName ?? '';
  const apellido = persona.last_name ?? persona.lastName ?? '';
  return delante === `${nombre} ${apellido}`.trim() ? persona.alias : '';
};
