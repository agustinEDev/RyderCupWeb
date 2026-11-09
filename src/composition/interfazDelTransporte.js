/**
 * La respuesta de la interfaz a lo que avisa el transporte
 * (`infrastructure/http/interfazDelTransporte`): los textos, los avisos, Sentry y
 * la página para volver tras entrar. El transporte decide QUÉ pasa (qué cierre,
 * en qué orden, con qué espera); aquí se dice CÓMO se ve.
 *
 * Lo importan main.jsx el primero, `composition/index` y `composition/http`, para
 * que esté registrado antes de que nada pueda llamar a la API o cerrar la sesión.
 */
import i18next from 'i18next';
import { guardaElAvisoDelCierre, muestraElAvisoDelCierre } from '../utils/avisoTrasElCierre';
import { captureError, clearUserContext } from '../utils/sentryHelpers';
import { avisaDelCierreForzado } from '../utils/avisoDeCierreForzado';
import { sinSesionEnRutaPublica } from '../utils/rutasPublicas';
import { redirigeAlLogin, ultimaCuentaDeEstaPestana } from '../utils/vueltaTrasEntrar';
import { llevaAAceptarLosTerminos, silenciaElAviso } from '../utils/terminosPendientes';
import { registraLaInterfazDelTransporte } from '../infrastructure/http/interfazDelTransporte';

// Cada una, envuelta: se lee el módulo al llamarla y no al registrarla, como
// cuando el transporte las importaba directamente
registraLaInterfazDelTransporte({
  avisaASentryDelCierre: (aviso) => avisaDelCierreForzado(aviso),
  olvidaElUsuarioDeSentry: () => clearUserContext(),
  /**
   * @param {'revocation'|'expiration'|string} motivo el del transporte; otro
   *   cualquiera es una sesión que terminó
   */
  /** @returns {boolean} si el aviso sale en ESTA página (y hay que esperar a que se lea) */
  avisaAlUsuarioDelCierre: (motivo) => {
    // Se enseña en /login, donde da tiempo a leerlo. Sin sessionStorage, aquí, como
    // antes: entonces quien cierra espera 500 ms antes de salir
    if (guardaElAvisoDelCierre(motivo)) return false;
    muestraElAvisoDelCierre(motivo, (clave, opciones) => i18next.t(clave, opciones));
    return true;
  },
  ultimaCuentaDeEstaPestana: () => ultimaCuentaDeEstaPestana(),
  redirigeAlLogin: (opciones) => redirigeAlLogin(opciones),
  sinSesionEnRutaPublica: (ruta, hayUsuarioGuardado) => sinSesionEnRutaPublica(ruta, hayUsuarioGuardado),
  traduce: (clave) => i18next.t(clave),
  informaDelError: (error, contexto) => captureError(error, contexto),
  llevaAAceptarLosTerminos: () => llevaAAceptarLosTerminos(),
  silenciaElAviso: (mensaje) => silenciaElAviso(mensaje),
});
