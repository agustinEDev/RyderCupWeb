/**
 * Lo último que cargó cada lista en esta visita, para enseñarlo sin red
 * (FE #647, fase 3; decidido el 2 nov 2026).
 *
 * Solo en memoria, a propósito: el almacenamiento del móvil lo comparte la cola
 * de golpes sin enviar, y perder eso sí sería grave (`loUltimoConocido`). Así
 * que al cerrar la aplicación se va, y una lista solo se puede enseñar sin red
 * si ya se cargó en esta visita.
 *
 * Va por cuenta: si entra otra persona sin recargar la página, no ve la lista
 * de la anterior. Y se vacía al cerrar sesión, con lo demás de la cuenta.
 */
const listas = new Map();

/** @param {string} clave La lista: 'competiciones', 'amigos'… */
export const guardaEnMemoria = (clave, usuarioId, datos) => {
  listas.set(clave, { usuarioId, datos });
};

/** @returns {*|null} Lo guardado por esta cuenta, o `null` */
export const loGuardadoEnMemoria = (clave, usuarioId) => {
  const guardado = listas.get(clave);
  return guardado && guardado.usuarioId === usuarioId ? guardado.datos : null;
};

export const vaciaLaMemoriaDeLasListas = () => listas.clear();
