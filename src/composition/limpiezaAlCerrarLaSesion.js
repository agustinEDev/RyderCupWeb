/**
 * Lo que se borra de la cuenta al cerrar la sesión: en un cierre duro
 * (revocación, sesión caducada, CSRF) y en `clearAuth`. `utils/deviceRevocationLogout` hace el cierre pero no conoce los
 * servicios que guardan cosas de la cuenta (utils no importa services): aquí,
 * en la composition root, se le dicen.
 *
 * Lo importa main.jsx el primero, para que esté puesto antes de que nada pueda
 * cerrar la sesión, y AuthContext, cuyo `clearAuth` usa el mismo registro.
 * El orden es el de siempre. Lo vigila
 * `limpiezaAlCerrarLaSesion.test.js`.
 */
import { alCerrarLaSesion } from '../utils/deviceRevocationLogout';
import { olvidaLoDeEstaCuenta } from '../services/loUltimoConocido';
import { olvidaElRefrescoDeHandicap } from '../services/refrescoDeHandicapApuntes';
import { olvidaLasNovedades } from '../services/novedadesDeActividad';

alCerrarLaSesion(olvidaLoDeEstaCuenta);
alCerrarLaSesion(olvidaElRefrescoDeHandicap);
// En todos los cierres, también en clearAuth: con la sesión muerta o revocada el
// número de Actividad y el del icono de la app se borran ya, no en la siguiente
// comprobación de la sesión (decidido el 9 nov 2026)
alCerrarLaSesion(olvidaLasNovedades);
