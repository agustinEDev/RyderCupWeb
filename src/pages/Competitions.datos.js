import { listUserCompetitionsUseCase } from '../composition';
import { cargaDeLaPantalla } from '../utils/cargaDeLaPantalla';

/**
 * Los datos de Torneos, antes de pintarla (FE #647, fase 3). Fichero aparte de
 * la pantalla: exportar el `loader` desde ella rompe el refresco en caliente
 * (`react-refresh/only-export-components`), y la ruta lo trae con `lazy` para
 * que no engorde el arranque.
 */
export const loader = () =>
  cargaDeLaPantalla({
    clave: 'competiciones',
    pedir: (usuario) => listUserCompetitionsUseCase.execute(usuario.id),
  });
