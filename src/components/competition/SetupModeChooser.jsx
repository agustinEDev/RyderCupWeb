import { useTranslation } from 'react-i18next';
import { Wand2, Hand, Trophy } from 'lucide-react';

/**
 * Cuánto hace la aplicación por su cuenta (FE #695).
 *
 * Decidido el 22 sep, después de ver lo laboriosa que es la pantalla de reparto
 * manual: la decisión se mueve AL PRINCIPIO. Se elige detrás del tipo, en un
 * paso propio, y decide qué pasos existen después.
 *
 * Tres tarjetas como las del tipo, y por lo mismo: en un teléfono la tarjeta
 * entera es el botón, que un botón pequeño dentro de una tarjeta ancha es el
 * que falla el dedo. Cada una dice lo que hace la app, no cómo se llama el
 * modo: «elige los equipos por ti» se entiende sin haber usado esto nunca.
 *
 * @param {Object} props
 * @param {string} [props.value] - El modo actual, al editar
 * @param {(modo: string) => void} props.onSelect
 */
const MODOS = [
  { id: 'AUTOMATIC', icono: Wand2 },
  { id: 'MANUAL', icono: Hand },
  { id: 'RYDER_CUP', icono: Trophy },
];

const SetupModeChooser = ({ value, onSelect }) => {
  const { t } = useTranslation('competitions');

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{t('create.setupMode.title')}</h2>
        <p className="text-sm text-gray-600">{t('create.setupMode.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODOS.map(({ id, icono: Icono }) => {
          const elegido = value === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`modo-${id}`}
              aria-pressed={elegido}
              onClick={() => onSelect(id)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                elegido
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <Icono className="mb-2 h-6 w-6 text-green-600" />
              <span className="block font-semibold text-gray-900">
                {t(`create.setupMode.${id}.title`)}
              </span>
              <span className="mt-1 block text-sm text-gray-600">
                {t(`create.setupMode.${id}.blurb`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SetupModeChooser;
