import { textoDeLaInsignia } from '../../domain/services/lineaDeActividad';

/**
 * El número de novedades sobre el botón de Actividad (FE-1): nada a 0, «1»…«9»
 * y «9+». Es solo visual (`aria-hidden`): el enlace lo cuenta aparte, con su
 * descripción, para no cambiarle el nombre al botón.
 */
const InsigniaDeNovedades = ({ n, className = '' }) => {
  const texto = textoDeLaInsignia(n);
  if (!texto) return null;

  return (
    <span
      data-testid="insignia-novedades"
      aria-hidden="true"
      className={`inline-flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {texto}
    </span>
  );
};

export default InsigniaDeNovedades;
