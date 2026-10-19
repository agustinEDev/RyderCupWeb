import { useTranslation } from 'react-i18next';
import { Map as IconoMapa } from 'lucide-react';

/** «Mapa», entre «Anterior» y «Siguiente», fuera de la tarjeta del hoyo (16 oct): abre el mapa del hoyo (BE #532). */
const BotonMapa = ({ onAbrir }) => {
  const { t } = useTranslation('scoring');
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="min-h-11 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/40 bg-white px-3 text-sm font-semibold text-primary hover:bg-green-50"
    >
      <IconoMapa className="h-4 w-4" aria-hidden="true" />
      {t('mapa.abrir')}
    </button>
  );
};

export default BotonMapa;
