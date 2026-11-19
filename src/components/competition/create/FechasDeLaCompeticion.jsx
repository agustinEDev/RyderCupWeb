import { useTranslation } from 'react-i18next';

/**
 * Las fechas, y lo que no vale de ellas junto a ellas: con la competición
 * cerrada por el plazo son lo único que se puede cambiar. `ref` es ese aviso,
 * que el envío trae a la vista.
 *
 * Los campos de fecha se salían de la tarjeta en el iPhone (FE #648). Medido
 * en un iPhone 14 real: con el mismo `w-full`, el campo de texto medía 292 px
 * y el de fecha 318. Safari en iOS dibuja `input[type="date"]` como control
 * nativo y ese control IMPONE su ancho: no lo arreglan `w-full`, ni `min-w-0`,
 * ni `max-w-full`. Lo único que lo libera es quitarle la apariencia nativa
 * (`appearance-none`), y entonces mide los mismos 292.
 *
 * No se reproduce en ningún navegador de escritorio, ni siquiera en WebKit,
 * que ahí dibuja otro control. Solo se ve en un teléfono.
 */
const FechasDeLaCompeticion = ({
  ref,
  startDate,
  endDate,
  onChange,
  error,
}) => {
  const { t } = useTranslation('competitions');
  return (
    <>
      <div
        data-testid="fila-fechas"
        className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3"
      >
        <div className="min-w-0">
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('create.startDate')}
          </label>
          <input
            id="startDate"
            type="date"
            name="startDate"
            value={startDate}
            onChange={onChange}
            className="w-full min-w-0 max-w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('create.endDate')}
          </label>
          <input
            id="endDate"
            type="date"
            name="endDate"
            value={endDate}
            onChange={onChange}
            className="w-full min-w-0 max-w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Lo que el servidor no aceptó de las fechas nuevas: junto a
      ellas, que son lo único que se puede cambiar */}
      {error && (
        <p
          ref={ref}
          tabIndex={-1}
          data-testid="error-de-las-fechas"
          role="alert"
          // Recibe el foco: con un anillo que se vea, como el aviso general
          className="rounded text-sm text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        >
          {error.texto}
        </p>
      )}
    </>
  );
};

export default FechasDeLaCompeticion;
