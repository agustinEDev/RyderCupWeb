import AccionesDeLaFicha from '../AccionesDeLaFicha';

/**
 * Las acciones de quien organiza: la principal, el menú y las destructivas, y
 * el aviso de que invitar abre las inscripciones.
 */
const GestionDeLaFicha = ({
  accionPrincipal,
  accionesDeGestion,
  accionesDestructivas,
  competition,
  fechaDeAperturaLegible,
  t,
}) => (
  <div
    className="p-4"
  >
    <AccionesDeLaFicha
      principal={accionPrincipal}
      acciones={accionesDeGestion}
      destructivas={accionesDestructivas}
      t={t}
    />

    {competition.status === 'DRAFT' && (
      // Invitar abre el torneo, y eso no se adivina mirando el botón.
      // También una programada: la política solo mira el estado
      <p
        className="mt-3 w-full text-sm text-gray-600"
        data-testid="invitar-abre-inscripciones"
      >
        {fechaDeAperturaLegible
          ? t('detail.invitingOpensScheduled', { fecha: fechaDeAperturaLegible })
          : t('detail.invitingOpensEnrollment')}
      </p>
    )}
  </div>
);

export default GestionDeLaFicha;
