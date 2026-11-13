/**
 * Lo que la interfaz usa de `infrastructure/http`: las rutas de las imágenes de
 * la API (`urlDeImagenDeLaApi`, para los avatares) y el transporte de la sesión
 * (token CSRF, refresco, cierres forzados). `apiRequest` no está: la
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

// El id que va en la ruta de la imagen del avatar, codificado (FE-03)
export {
  segmento,
  valeComoSegmento,
  urlDeImagenDeLaApi,
} from '../infrastructure/http/rutaDeLaApi';
export { setCsrfTokenGlobal } from '../infrastructure/http/csrfTokenSync';
export {
  copiaDelUsuarioEnElDispositivo,
  esLaCopiaReducida,
} from '../infrastructure/http/copiaDelUsuarioEnElDispositivo';
export {
  handleDeviceRevocationLogout,
  marcaLaRevocacionPropia,
  olvidaLoGuardadoDeLaCuenta,
} from '../infrastructure/http/deviceRevocationLogout';
export {
  refrescoCompartido,
  getLastRefreshAt,
  trataElFalloDelRefresco,
} from '../infrastructure/http/tokenRefreshInterceptor';
