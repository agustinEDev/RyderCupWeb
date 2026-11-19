import { useSinConexion } from './useSinConexion';

/**
 * Qué se cuenta como falta de señal y qué como error en la anotación de
 * partida rápida (`QuickMatchScoringPage`).
 *
 * Quedarse sin cobertura no es un error: el sondeo falla cada diez segundos
 * y la pantalla ya lo cuenta en ámbar. El rojo, además, quedaba justo debajo
 * del ámbar diciendo lo contrario. Un fallo CON estado sí es un error de
 * verdad —el servidor contestó algo— y ese se sigue enseñando.
 *
 * O bien no hubo respuesta, o bien lo que se está viendo sale de la memoria
 * del móvil: en los dos casos lo que hay en pantalla puede no estar al día, y
 * en ninguno es un error. Con un 5xx la pantalla se pintaba entera desde el
 * móvil bajo un recuadro rojo, sin decir que era una foto de antes.
 *
 * @param {{ loadError: any, saveError: any, pintadoDeMemoria: any }} estado
 * @returns {{ sinConexion: boolean, sondeoSinRespuesta: boolean, errorDeVerdad: any }}
 */
export const useSinConexionDeLaRapida = ({
  loadError,
  saveError,
  pintadoDeMemoria,
}) => {
  const sinConexion = useSinConexion();
  const sondeoSinRespuesta =
    (!!loadError &&
      (loadError.status ?? loadError.response?.status) === undefined) ||
    !!pintadoDeMemoria;
  const errorDeVerdad = saveError || (loadError && !sondeoSinRespuesta);
  return { sinConexion, sondeoSinRespuesta, errorDeVerdad };
};
