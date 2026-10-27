/**
 * Si un error es el 403 de lo jugado de una privada en la que no está y sin
 * la llave de un amigo (release social 2): reintentar no lo arregla, se dice.
 */
export const esDeUnaPrivada = (error) =>
  error?.status === 403 && error?.errorCode === 'PRIVATE_COMPETITION';
