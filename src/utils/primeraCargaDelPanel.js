/**
 * Si el panel ya se ha pintado entero alguna vez en esta carga de la pagina
 * (FE #485).
 *
 * La espera a pantalla completa —las cuatro peticiones del panel y sus textos—
 * es cosa del ARRANQUE, o de entrar recien hecho el login. No de cada visita:
 * `Dashboard` se remonta en cada toque de «Inicio» en la barra inferior, asi
 * que con estado propio del componente volver al panel a media sesion se
 * quedaba hasta tres segundos en la pantalla de espera, donde antes aparecia en
 * cuanto llegaban las competiciones.
 *
 * Vive en el modulo a proposito: al recargar la pagina se evalua de nuevo, que
 * es exactamente el grano que hace falta.
 */

let sePinto = false;

export const elPanelYaSePinto = () => sePinto;

export const anotaQueElPanelSePinto = () => {
  sePinto = true;
};

/** Solo para las pruebas: el rastro sobrevive de un test al siguiente. */
export const olvidaQueElPanelSePinto = () => {
  sePinto = false;
};

/**
 * Mas alla de esto el panel se pinta con lo que tenga. Es el mismo compromiso
 * que la cortina del arranque: esperar a las cuatro peticiones evita que la
 * pantalla se monte a trozos, pero una que no vuelva no puede dejar el panel
 * muerto detras de una espera.
 */
export const ESPERA_MAXIMA_MS = 3000;
