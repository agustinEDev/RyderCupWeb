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
 * «Todo automático» se enseña pero todavía NO se puede elegir, como Stableford
 * y Medal en el tipo: la aplicación aún no forma los equipos ni monta la agenda
 * sola, y una tarjeta que lo prometa miente. Se abre cuando exista.
 *
 * @param {Object} props
 * @param {string} [props.value] - El modo actual, al editar
 * @param {(modo: string) => void} props.onSelect
 */
const MODOS = [
  { id: 'AUTOMATIC', icono: Wand2, disponible: false },
  { id: 'MANUAL', icono: Hand, disponible: true },
  { id: 'RYDER_CUP', icono: Trophy, disponible: true },
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
        {MODOS.map(({ id, icono: Icono, disponible }) => {
          const elegido = value === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`modo-${id}`}
              // Marcado aunque no se pueda elegir: una competición creada por
              // API en ese modo tiene que verse como lo que es
              aria-pressed={elegido}
              aria-disabled={disponible ? undefined : 'true'}
              tabIndex={disponible ? undefined : -1}
              onClick={disponible ? () => onSelect(id) : undefined}
              // Arriba en todas: un botón centra su contenido, y la tarjeta de
              // «próximamente», más alta, desalineaba los iconos (#710)
              className={`flex w-full flex-col items-start justify-start rounded-xl border p-4 text-left transition-colors ${
                !disponible
                  // Fondo apagado y NO `opacity`: atenuar la tarjeta entera se
                  // lleva por delante el texto, que es lo que viene a decir. Y
                  // si es el modo que ya tiene la competición, conserva el
                  // marco verde: verla gris y sin marcar sería esconderlo
                  ? `pointer-events-none cursor-default bg-gray-50 ${
                      elegido ? 'border-green-600' : 'border-gray-200'
                    }`
                  : elegido
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <Icono className={`mb-2 h-6 w-6 ${disponible ? 'text-green-600' : 'text-gray-500'}`} />
              <span className={`block font-semibold ${disponible ? 'text-gray-900' : 'text-gray-700'}`}>
                {t(`create.setupMode.${id}.title`)}
              </span>
              <span className="mt-1 block text-sm text-gray-600">
                {t(`create.setupMode.${id}.blurb`)}
              </span>
              {/* El «próximamente» SIEMPRE visible, nunca en un tooltip: en un
                  teléfono no hay ratón que lo descubra */}
              {!disponible && (
                <span className="mt-2 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {t('create.type.comingSoon')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SetupModeChooser;
