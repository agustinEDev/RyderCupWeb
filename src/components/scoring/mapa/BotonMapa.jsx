import { useTranslation } from 'react-i18next';
import { Map as IconoMapa } from 'lucide-react';

/** «Mapa», al pie de la tarjeta del hoyo: abre el mapa del hoyo (BE #532). */
const BotonMapa = ({ onAbrir }) => {
  const { t } = useTranslation('scoring');
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="min-h-11 inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 text-sm font-semibold text-primary hover:bg-green-100"
    >
      <IconoMapa className="h-4 w-4" aria-hidden="true" />
      {t('mapa.abrir')}
    </button>
  );
};

export default BotonMapa;
