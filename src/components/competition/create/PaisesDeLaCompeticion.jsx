import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CountryAutocomplete from '../../ui/CountryAutocomplete';
import SoloLectura from './SoloLectura';
import SelectorDePaisVecino from './SelectorDePaisVecino';

/**
 * El país principal y, si los tiene, un adyacente y un tercero. Cerrada por el
 * plazo, se ven pero no se cambian.
 */
const PaisesDeLaCompeticion = ({
  soloFechas,
  formData,
  allCountries,
  adjacentCountries1,
  adjacentCountries2,
  sortedAdjacentCountries1,
  sortedAdjacentCountries2,
  onElegirPais,
  onAnadirAdyacente1,
  onCambiarAdyacente1,
  onQuitarAdyacente1,
  onAnadirAdyacente2,
  onCambiarAdyacente2,
  onQuitarAdyacente2,
}) => {
  const { t } = useTranslation('competitions');
  return (
    <SoloLectura activa={soloFechas} className="space-y-3">
      {/* El país principal se elige entre los 200: es el único de
      los tres selectores que necesita búsqueda, porque los
      adyacentes ya listan solo países fronterizos */}
      <CountryAutocomplete
        id="country"
        countries={allCountries}
        value={formData.country?.code || ''}
        label={t('create.country')}
        placeholder={t('create.selectCountry')}
        onChange={onElegirPais}
      />

      {/* Adjacent Country 1 */}
      {formData.country &&
        !formData.showAdjacentCountry1 &&
        adjacentCountries1.length > 0 && (
          <button
            type="button"
            onClick={onAnadirAdyacente1}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('create.addAdjacentCountry')}
          </button>
        )}

      {formData.showAdjacentCountry1 && (
        <SelectorDePaisVecino
          id="adjacentCountry1"
          etiqueta={t('create.adjacentCountry')}
          opcionVacia={t('create.selectAdjacentCountry')}
          valor={formData.adjacentCountry1}
          paises={sortedAdjacentCountries1}
          onChange={onCambiarAdyacente1}
          etiquetaDeQuitar={t('create.removeCountryField', {
            field: t('create.adjacentCountry'),
          })}
          onQuitar={onQuitarAdyacente1}
        />
      )}

      {/* Adjacent Country 2 */}
      {formData.adjacentCountry1 &&
        !formData.showAdjacentCountry2 &&
        adjacentCountries2.length > 0 && (
          <button
            type="button"
            onClick={onAnadirAdyacente2}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('create.addThirdCountry')}
          </button>
        )}

      {/* El tercero no ofrece el adyacente, que ya está elegido */}
      {formData.showAdjacentCountry2 && (
        <SelectorDePaisVecino
          id="adjacentCountry2"
          etiqueta={t('create.thirdCountry')}
          opcionVacia={t('create.selectThirdCountry')}
          valor={formData.adjacentCountry2}
          paises={sortedAdjacentCountries2.filter(
            (c) => c.code !== formData.adjacentCountry1,
          )}
          onChange={onCambiarAdyacente2}
          etiquetaDeQuitar={t('create.removeCountryField', {
            field: t('create.thirdCountry'),
          })}
          onQuitar={onQuitarAdyacente2}
        />
      )}
    </SoloLectura>
  );
};

export default PaisesDeLaCompeticion;
