import { ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CountryFlag } from '../../ui/CountryFlag';
import { formatCountryName } from '../../../services/countries';

/**
 * Un selector de país vecino (el adyacente o el tercero), con su bandera y su
 * botón de quitar. Los textos llegan escritos: cada uno dice el suyo.
 */
const SelectorDePaisVecino = ({
  id,
  etiqueta,
  opcionVacia,
  valor,
  paises,
  onChange,
  etiquetaDeQuitar,
  onQuitar,
}) => {
  const { i18n } = useTranslation('competitions');
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {etiqueta}
        </label>
        <div className="relative">
          <select
            id={id}
            name={id}
            value={valor}
            onChange={onChange}
            className={`w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10 ${
              valor ? 'pl-12' : 'pl-3'
            }`}
          >
            <option value="">{opcionVacia}</option>
            {paises.map((country) => (
              <option key={country.id} value={country.id}>
                {formatCountryName(country, i18n.language)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          {/* Show flag if country is selected */}
          {valor && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <CountryFlag
                countryCode={valor}
                style={{ width: '24px', height: 'auto' }}
              />
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={etiquetaDeQuitar}
        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default SelectorDePaisVecino;
