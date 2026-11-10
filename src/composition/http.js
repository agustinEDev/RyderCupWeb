/**
 * Lo que la interfaz usa de `infrastructure/http`: la URL base de la API
 * (`getApiBaseUrl`, para los avatares) y el transporte de la sesión (token CSRF,
 * refresco, cierres forzados, `olvidaLoDeLaCuenta`). `apiRequest` no está: la
 * interfaz no llama a la API, pide un caso de uso a `composition` (lo vigila
 * ESLint con no-restricted-imports).
 *
 * La interfaz no importa la infraestructura directamente: pasa por la
 * composition root, como con los casos de uso. Va aparte de `composition/index`
 * porque muchos tests mockean ese módulo entero, y porque así quien pinta no
 * carga todos los repositorios para leer el token CSRF.
 *
 * Efecto al importarlo: carga el registro de limpiezas al cerrar sesión
 * (`./limpiezaAlCerrarLaSesion`) y la respuesta de la interfaz al transporte
 * (`./interfazDelTransporte`), así quien use el transporte por aquí los tiene
 * registrados sin acordarse de un import aparte.
 */
import './limpiezaAlCerrarLaSesion';
import './interfazDelTransporte';

export { getApiBaseUrl } from '../infrastructure/http/urlDeLaApi';
export { setCsrfTokenGlobal } from '../infrastructure/http/csrfTokenSync';
export {
  copiaDelUsuarioEnElDispositivo,
  esLaCopiaReducida,
} from '../infrastructure/http/copiaDelUsuarioEnElDispositivo';
export {
  handleDeviceRevocationLogout,
  marcaLaRevocacionPropia,
  olvidaLoDeLaCuenta,
  olvidaLoGuardadoDeLaCuenta,
} from '../infrastructure/http/deviceRevocationLogout';
export {
  refrescoCompartido,
  getLastRefreshAt,
  trataElFalloDelRefresco,
} from '../infrastructure/http/tokenRefreshInterceptor';
