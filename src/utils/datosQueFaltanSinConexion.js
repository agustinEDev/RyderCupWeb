/**
 * Sin red el usuario sale de la copia del dispositivo (`sinConfirmar`), que no guarda
 * el género ni el hándicap (fase 3, FE-06). Ahí su ausencia es «no se sabe», no
 * «falta»: no se pide el género ni se avisa de que falta el hándicap hasta que el
 * servidor confirme la sesión. Con red, como siempre.
 */

/**
 * @param {Object|null} usuario El de `useAuth`
 * @param {boolean} sinConfirmar Si sale de la copia del dispositivo
 */
export const faltaElGenero = (usuario, sinConfirmar) => Boolean(usuario) && !sinConfirmar && !usuario.gender;

/**
 * @param {Object|null} usuario El de `useAuth`
 * @param {boolean} sinConfirmar Si sale de la copia del dispositivo
 */
export const faltaElHandicap = (usuario, sinConfirmar) =>
  Boolean(usuario) && !sinConfirmar && (usuario.handicap === null || usuario.handicap === undefined);
