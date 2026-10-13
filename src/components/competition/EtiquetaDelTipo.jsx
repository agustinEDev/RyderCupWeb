import { useTranslation } from 'react-i18next';
import { RYDER_CUP } from '../../domain/value_objects/TournamentType';

// Un color por tipo, para distinguirlos de un vistazo en una lista
const COLORES = {
  RYDER_CUP: 'bg-blue-50 text-blue-800 border-blue-200',
  STABLEFORD: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  MEDAL: 'bg-amber-50 text-amber-800 border-amber-200',
};

/**
 * Qué torneo es, en las tarjetas de «Mis próximos partidos» y «Mis
 * competiciones» (FE #845, #846). El nombre es el mismo que al elegirlo al
 * crearla. Sin tipo, una Ryder Cup: es lo que eran todas.
 *
 * @param {{tipo?: string|null}} props
 */
const EtiquetaDelTipo = ({ tipo }) => {
  const { t } = useTranslation('competitions');
  const elTipo = tipo ?? RYDER_CUP;
  return (
    <span
      data-testid="tipo-de-torneo"
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${COLORES[elTipo] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}
    >
      {t(`create.type.${elTipo}.title`, { defaultValue: elTipo })}
    </span>
  );
};

export default EtiquetaDelTipo;
