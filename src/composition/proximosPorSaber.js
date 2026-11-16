import { olvidaQueNoHayProximos } from '../services/loUltimoConocido';

/**
 * Un caso de uso que puede dar un partido a quien lo usa (aceptar una
 * invitación, inscribirse, coger plaza en una franja, crear una partida
 * rápida…), o que el organizador usa para poner jugadores en partidos y
 * partidas, donde puede estar él. Al salir bien se olvida «no hay próximos»: el
 * panel lo comprobará al volver en vez de ofrecer «¿Partido improvisado?»
 * (Agustín, 16 nov 2026, FE #1152).
 *
 * Aquí, en la composition, y no en los casos de uso: la aplicación no conoce lo
 * que se guarda en el móvil. Si falla, no se olvida nada.
 *
 * @template T
 * @param {T & {execute: Function}} casoDeUso
 * @returns {T}
 */
export const puedeDarUnPartido = (casoDeUso) => {
  const original = casoDeUso.execute.bind(casoDeUso);
  casoDeUso.execute = async (...args) => {
    const resultado = await original(...args);
    olvidaQueNoHayProximos();
    return resultado;
  };
  return casoDeUso;
};
