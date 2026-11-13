import { useState, useEffect } from 'react';
import { getTeeGroupsUseCase } from '../composition';
import { todasLasFranjasCerradas } from '../domain/services/PartidasDeLaFranja';

/**
 * Con todas las franjas jugadas y cerradas, «Terminar competición» a la
 * vista del organizador: en el menú no se encontraba (QA del 11 oct 2026).
 * Una franja no cambia de estado al cerrarse: se miran sus partidas.
 * Con las franjas a las que se refiere: un «sí» de otras no vale (/code-review)
 */
export const useSePuedeTerminarLaCompeticion = ({
  competition,
  hasCreatorRole,
  isAdmin,
  userId,
  agendaLeida,
  versionDePartidas,
}) => {
  const [cierre, setCierre] = useState({ clave: null, cerradas: false });
  const leeSiTerminar =
    competition?.hasTeams === false &&
    competition?.status === 'IN_PROGRESS' &&
    (hasCreatorRole || isAdmin || competition?.creatorId === userId);
  // Solo las que tienen a alguien: una franja vacía no se juega (revisor). Se
  // mira con cada lectura de la agenda: también acaban partidas al entregar
  const franjasJugadas = (agendaLeida?.rounds ?? []).filter((r) => r.teeSheet?.placesTaken > 0).map((r) => r.id);
  const claveDeFranjas = franjasJugadas.join('|');
  useEffect(() => {
    if (!leeSiTerminar || !claveDeFranjas) return undefined;
    let vigente = true;
    Promise.all(claveDeFranjas.split('|').map((roundId) => getTeeGroupsUseCase.execute(roundId)))
      .then((vistas) => vigente && setCierre({ clave: claveDeFranjas, cerradas: todasLasFranjasCerradas(vistas) }))
      .catch(() => vigente && setCierre({ clave: claveDeFranjas, cerradas: false }));
    return () => {
      vigente = false;
    };
  }, [leeSiTerminar, claveDeFranjas, versionDePartidas, agendaLeida]);

  return { leeSiTerminar, claveDeFranjas, cierre };
};
