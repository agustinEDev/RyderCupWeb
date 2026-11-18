import { useTranslation } from 'react-i18next';

/**
 * Privada o pública, arriba y pequeño: de quién es el torneo se decide al
 * montarlo, no en «Más opciones». Privada por defecto, que es lo que hay hoy y
 * lo que no enseña nada a nadie por error (FE #664).
 */
const VisibilidadDeLaCompeticion = ({ visibility, onElegir }) => {
  const { t } = useTranslation('competitions');
  return (
    <div>
      <span
        id="etiqueta-visibilidad"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {t('create.visibility')}
      </span>
      {/* Los dos botones van juntos y con su pregunta: sueltos, un
      lector de pantalla dice «Solo invitados, pulsado» sin
      decir a qué pregunta responde */}
      <div
        role="group"
        aria-labelledby="etiqueta-visibilidad"
        className="flex flex-wrap gap-2"
      >
        {['PRIVATE', 'PUBLIC'].map((cual) => (
          <button
            key={cual}
            type="button"
            data-testid={`visibilidad-${cual}`}
            aria-pressed={visibility === cual}
            onClick={() => onElegir(cual)}
            className={`border-2 rounded-lg text-sm px-3 py-2 transition-colors ${
              visibility === cual
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
            }`}
          >
            {t(`create.visibility${cual === 'PRIVATE' ? 'Private' : 'Public'}`)}
          </button>
        ))}
      </div>
      {/* «Privada» a secas no dice si la gente puede apuntarse sola */}
      <p
        data-testid="visibilidad-explicacion"
        className="text-xs text-gray-500 mt-1"
      >
        {t(
          visibility === 'PUBLIC'
            ? 'create.visibilityPublicHelp'
            : 'create.visibilityPrivateHelp',
        )}
      </p>
    </div>
  );
};

export default VisibilidadDeLaCompeticion;
