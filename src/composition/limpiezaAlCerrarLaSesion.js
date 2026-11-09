/**
 * Lo que se borra de la cuenta en un cierre duro (revocación, sesión caducada,
 * CSRF). `utils/deviceRevocationLogout` hace el cierre pero no conoce los
 * servicios que guardan cosas de la cuenta (utils no importa services): aquí,
 * en la composition root, se le dicen.
 *
 * Lo importa main.jsx el primero, para que esté puesto antes de que nada pueda
 * cerrar la sesión. El orden es el de siempre. Lo vigila
 * `limpiezaAlCerrarLaSesion.test.js`.
 */
import { alCerrarLaSesion } from '../utils/deviceRevocationLogout';
import { olvidaLoDeEstaCuenta } from '../services/loUltimoConocido';
import { olvidaElRefrescoDeHandicap } from '../services/refrescoDeHandicapApuntes';
import { olvidaLasNovedades } from '../services/novedadesDeActividad';

alCerrarLaSesion(olvidaLoDeEstaCuenta);
alCerrarLaSesion(olvidaElRefrescoDeHandicap);
alCerrarLaSesion(olvidaLasNovedades);
