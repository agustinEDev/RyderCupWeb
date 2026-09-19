import { useTranslation } from 'react-i18next';
import { Trophy, ListOrdered, Flag } from 'lucide-react';

/**
 * Qué tipo de competición se va a crear (FE #639).
 *
 * Hoy solo existe la Ryder Cup. Stableford y Medal se enseñan igualmente, y a
 * propósito: la decisión de RyderCupAm#251 es que el tipo se pregunte primero, y
 * quien abre esta pantalla —un director deportivo, por ejemplo— tiene que ver
 * que la aplicación va hacia ahí. Cuando existan, esto es rellenar un hueco.
 *
 * Los que no están tienen que leerse como lo que son. Dos cuidados, los dos del
 * móvil:
 *
 *   - El «próximamente» va SIEMPRE visible en la tarjeta, nunca en un tooltip:
 *     en un teléfono no hay ratón que lo descubra.
 *   - La tarjeta entera es el botón. Un botón pequeño dentro de una tarjeta a
 *     ancho completo es el que falla el dedo.
 */
const TIPOS = [
  { id: 'RYDER_CUP', icono: Trophy, disponible: true },
  { id: 'STABLEFORD', icono: ListOrdered, disponible: false },
  { id: 'MEDAL', icono: Flag, disponible: false },
];

const CompetitionTypeChooser = ({ onSelect }) => {
  const { t } = useTranslation('competitions');

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{t('create.type.title')}</h2>
        <p className="text-sm text-gray-600">{t('create.type.subtitle')}</p>
      </div>

      {/* Apiladas en el móvil, en fila a partir de `sm`: en un teléfono la
          tarjeta ocupa el ancho entero y se toca sin apuntar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TIPOS.map(({ id, icono: Icono, disponible }) => (
          <button
            key={id}
            type="button"
            data-testid={`tipo-${id}`}
            onClick={disponible ? () => onSelect(id) : undefined}
            aria-disabled={disponible ? undefined : 'true'}
            tabIndex={disponible ? undefined : -1}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              disponible
                ? 'border-gray-200 bg-white hover:border-green-500 hover:bg-green-50'
                : 'pointer-events-none cursor-default border-gray-200 bg-white opacity-50'
            }`}
          >
            <Icono className={`mb-2 h-6 w-6 ${disponible ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="block font-semibold text-gray-900">{t(`create.type.${id}.title`)}</span>
            <span className="mt-1 block text-sm text-gray-600">{t(`create.type.${id}.blurb`)}</span>
            {!disponible && (
              <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {t('create.type.comingSoon')}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CompetitionTypeChooser;
