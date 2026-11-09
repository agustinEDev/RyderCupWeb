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
import customToast from '../utils/toast';
import { captureError, clearUserContext } from '../utils/sentryHelpers';
import { avisaDelCierreForzado } from '../utils/avisoDeCierreForzado';
import { sinSesionEnRutaPublica } from '../utils/rutasPublicas';
import { redirigeAlLogin, ultimaCuentaDeEstaPestana } from '../utils/vueltaTrasEntrar';
import { llevaAAceptarLosTerminos, silenciaElAviso } from '../utils/terminosPendientes';
import { registraLaInterfazDelTransporte } from '../infrastructure/http/interfazDelTransporte';

// El aviso de cada cierre forzado: su texto y su icono
const AVISO_DEL_CIERRE = Object.freeze({
  revocation: { clave: 'errors.deviceRevoked', icono: '🔒' },
  expiration: { clave: 'errors.sessionExpired', icono: '⏱️' },
});
const AVISO_DE_SESION_TERMINADA = Object.freeze({ clave: 'errors.sessionEnded', icono: 'ℹ️' });

// Cada una, envuelta: se lee el módulo al llamarla y no al registrarla, como
// cuando el transporte las importaba directamente
registraLaInterfazDelTransporte({
  avisaASentryDelCierre: (aviso) => avisaDelCierreForzado(aviso),
  olvidaElUsuarioDeSentry: () => clearUserContext(),
  /**
   * @param {'revocation'|'expiration'|string} motivo el del transporte; otro
   *   cualquiera es una sesión que terminó
   */
  avisaAlUsuarioDelCierre: (motivo) => {
    const { clave, icono } = AVISO_DEL_CIERRE[motivo] ?? AVISO_DE_SESION_TERMINADA;
    // `delCierre`: el único aviso de error que sale con el cierre en marcha (A1)
    customToast.error(i18next.t(clave, { ns: 'auth' }), { duration: 8000, icon: icono, delCierre: true });
  },
  ultimaCuentaDeEstaPestana: () => ultimaCuentaDeEstaPestana(),
  redirigeAlLogin: (opciones) => redirigeAlLogin(opciones),
  sinSesionEnRutaPublica: (ruta, hayUsuarioGuardado) => sinSesionEnRutaPublica(ruta, hayUsuarioGuardado),
  traduce: (clave) => i18next.t(clave),
  informaDelError: (error, contexto) => captureError(error, contexto),
  llevaAAceptarLosTerminos: () => llevaAAceptarLosTerminos(),
  silenciaElAviso: (mensaje) => silenciaElAviso(mensaje),
});
