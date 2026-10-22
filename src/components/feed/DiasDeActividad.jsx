import { useTranslation } from 'react-i18next';
import { etiquetaDelDia } from './textosDeActividad';

/**
 * Las tarjetas de actividad agrupadas por día, cada día con su separador
 * («Hoy», «Ayer», «mié 15 oct», «15 oct»). La tarjeta solo pone la hora en los
 * días anteriores: el día lo dice el separador. Lo usan Actividad y el perfil
 * de un amigo, cada uno pintando sus tarjetas con `pintaTarjeta`. `nivel` es
 * el del título del separador: en el perfil cuelga de «Su actividad» (h3).
 */
const DiasDeActividad = ({ dias, ahora, pintaTarjeta, nivel = 2, ...resto }) => {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const Titulo = `h${nivel}`;

  return (
    <div className="space-y-6" {...resto}>
      {dias.map((dia) => (
        <section key={dia.clave} aria-labelledby={`dia-${dia.clave}`}>
          <Titulo
            id={`dia-${dia.clave}`}
            data-testid="separador-dia"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            {etiquetaDelDia(dia.fecha, ahora, t, i18n?.language)}
          </Titulo>
          <div className="space-y-3">{dia.tarjetas.map(pintaTarjeta)}</div>
        </section>
      ))}
    </div>
  );
};

export default DiasDeActividad;
