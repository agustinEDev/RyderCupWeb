/**
 * Lo que la interfaz usa de `infrastructure/http`: el cliente de la API
 * (`apiRequest`, `getApiBaseUrl`) y el transporte de la sesión (token CSRF,
 * refresco, cierres forzados, `olvidaLoDeLaCuenta`).
 *
 * La interfaz no importa la infraestructura directamente: pasa por la
 * composition root, como con los casos de uso. Va aparte de `composition/index`
 * porque muchos tests mockean ese módulo entero, y porque así quien pinta no
 * carga todos los repositorios para leer el token CSRF.
 *
 * Efecto al importarlo: carga el registro de limpiezas al cerrar sesión
 * (`./limpiezaAlCerrarLaSesion`), así quien use `olvidaLoDeLaCuenta` por aquí
 * lo tiene relleno sin acordarse de un import aparte.
 */
import './limpiezaAlCerrarLaSesion';

export { apiRequest, getApiBaseUrl } from '../infrastructure/http/api';
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
