/**
 * El fondo del hueco para anotar (FE #725): el siguiente en verde lleno, los
 * demás vacíos en borde verde. Aparte del componente para que el refresco en
 * caliente siga funcionando.
 */
export const clasesDelHueco = (siguiente) =>
  siguiente
    ? 'bg-primary text-white hover:bg-primary/90 ring-4 ring-primary-100'
    : 'bg-white border-2 border-primary text-primary-700 hover:bg-primary-50';
