import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

/**
 * El hueco donde se toca para anotar un golpe (FE #725).
 *
 * Parecía desactivado: gris sobre gris en la partida rápida y un borde
 * discontinuo vacío en la competición. Agustín eligió la opción B, solo los
 * botones: el siguiente hueco por anotar va en verde lleno con «+ Anotar», y
 * los demás vacíos en borde verde. Cuál es el siguiente lo decide cada casilla;
 * aquí solo vive cómo se ve (el texto aquí y el fondo en `clasesDelHueco`),
 * para que las dos anotaciones digan lo mismo.
 */
export const HuecoParaAnotar = ({ siguiente }) => {
  const { t } = useTranslation('scoring');

  return (
    <span
      data-testid={siguiente ? 'anotar-siguiente' : 'anotar'}
      className="flex items-center justify-center gap-1 text-sm font-semibold"
    >
      {siguiente && <Plus data-testid="anotar-mas" className="h-4 w-4" aria-hidden="true" />}
      {t('input.tapToScore')}
    </span>
  );
};
