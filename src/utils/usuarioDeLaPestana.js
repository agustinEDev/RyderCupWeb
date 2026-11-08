/**
 * Quién es esta pestaña, según la sesión compartida. Vive aparte porque el
 * interceptor lo necesita y `services/sesionCompartida`, que lo sabe, ya depende del
 * interceptor.
 */
let lector = () => null;

/** @param {() => ({id?: string}|null)} leeElUsuario */
export const registraElUsuarioDeLaPestana = (leeElUsuario) => {
  lector = leeElUsuario;
};

export const usuarioDeLaPestana = () => lector();
