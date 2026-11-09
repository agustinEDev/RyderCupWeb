/**
 * Lo que se borra de la cuenta al cerrar la sesión: en un cierre duro
 * (revocación, sesión caducada, CSRF) y en `clearAuth`.
 * `infrastructure/http/deviceRevocationLogout` hace el cierre pero no conoce los
 * servicios que guardan cosas de la cuenta (infrastructure/http no importa
 * services): aquí, en la composition root, se le dicen.
 *
 * Lo importa main.jsx el primero, para que esté puesto antes de que nada pueda
 * cerrar la sesión, y AuthContext, cuyo `clearAuth` usa el mismo registro.
 * El orden es el de siempre. Lo vigila
 * `limpiezaAlCerrarLaSesion.test.js`.
 */
import { alCerrarLaSesion } from '../infrastructure/http/deviceRevocationLogout';
import { olvidaLoDeEstaCuenta } from '../services/loUltimoConocido';
import { olvidaElRefrescoDeHandicap } from '../services/refrescoDeHandicapApuntes';
import { olvidaLasNovedades } from '../services/novedadesDeActividad';
import { olvidaLaCopiaParaArrancarSinCobertura } from '../services/sesionCompartida';

alCerrarLaSesion(olvidaLoDeEstaCuenta);
alCerrarLaSesion(olvidaElRefrescoDeHandicap);
// En todos los cierres, también en clearAuth: con la sesión muerta o revocada el
// número de Actividad y el del icono de la app se borran ya, no en la siguiente
// comprobación de la sesión (decidido el 9 nov 2026)
alCerrarLaSesion(olvidaLasNovedades);
// La copia del usuario para arrancar sin cobertura: un cierre forzado no pasa por
// `olvidaLaSesion`, y sin esto el móvil sin red seguía entrando con el nombre y el
// correo de la cuenta revocada (batería del Kind, 9 nov 2026)
alCerrarLaSesion(olvidaLaCopiaParaArrancarSinCobertura);
