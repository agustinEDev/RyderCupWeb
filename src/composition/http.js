/**
 * Lo que la interfaz usa del transporte de la sesión (`infrastructure/http`).
 *
 * La interfaz no importa la infraestructura directamente: pasa por la
 * composition root, como con los casos de uso. Va aparte de `composition/index`
 * porque muchos tests mockean ese módulo entero, y porque así quien pinta no
 * carga todos los repositorios para leer el token CSRF.
 *
 * Carga el registro de limpiezas al cerrar sesión: quien use `olvidaLoDeLaCuenta`
 * por aquí lo tiene relleno sin acordarse de un import aparte (/code-review de la 2a).
 */
import './limpiezaAlCerrarLaSesion';

export { setCsrfTokenGlobal } from '../infrastructure/http/csrfTokenSync';
export {
  handleDeviceRevocationLogout,
  marcaLaRevocacionPropia,
  olvidaLoDeLaCuenta,
} from '../infrastructure/http/deviceRevocationLogout';
export {
  refrescoCompartido,
  getLastRefreshAt,
  trataElFalloDelRefresco,
} from '../infrastructure/http/tokenRefreshInterceptor';
