/**
 * Lo que la interfaz usa del transporte de la sesión (`infrastructure/http`).
 *
 * La interfaz no importa la infraestructura directamente: pasa por la
 * composition root, como con los casos de uso. Va aparte de `composition/index`
 * porque muchos tests mockean ese módulo entero, y porque así quien pinta no
 * carga todos los repositorios para leer el token CSRF.
 */
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
