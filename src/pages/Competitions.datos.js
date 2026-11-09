import { listUserCompetitionsUseCase } from '../composition';
import { cargaDeLaPantalla, soloSiSePideOtraVez } from '../services/cargaDeLaPantalla';
import { cargarConReintento } from '../utils/lazyWithRetry';

/**
 * Los datos de Torneos, antes de pintarla (FE #647, fase 3). Fichero aparte de
 * la pantalla: exportar el `loader` desde ella rompe el refresco en caliente
 * (`react-refresh/only-export-components`).
 *
 * La ruta lo importa sin `lazy`: con `lazy`, abrir la aplicación en Torneos
 * esperaba a bajar dos trozos antes de montar la carcasa (segundo revisor), y
 * esto apenas pesa —los casos de uso ya van en el arranque—. La pantalla sí se
 * baja aparte; se pide aquí, a la vez que los datos, y no después.
 */
export const loader = () => {
  cargarConReintento(() => import('./Competitions')).catch(() => {
    // La recogerá su `lazy` al pintarse, con su propio reintento
  });
  return cargaDeLaPantalla({
    // En inglés: es el nombre con el que sale en la consola, como antes
    clave: 'competitions',
    pedir: (usuario) => listUserCompetitionsUseCase.execute(usuario.id),
  });
};

export const shouldRevalidate = soloSiSePideOtraVez;
