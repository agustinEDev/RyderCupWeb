import { useCallback } from 'react';
import { getTeeWindowStandingsUseCase } from '../../composition';
import Clasificacion from './Clasificacion';

// Mientras la pestaña está abierta, cada cuánto se relee
const CADA = 30000;

/**
 * La clasificación de la franja, en la pestaña de la partida (FE #824, PR 7;
 * caso 11): la pieza común con lo que se pide.
 *
 * @param {Object} props
 * @param {string} props.roundId - La franja
 * @param {string} [props.userId] - Quién mira, destacado
 * @param {boolean} props.activa - Si la pestaña está abierta
 */
const ClasificacionDeLaFranja = ({ roundId, userId, activa }) => {
  const pedir = useCallback((categoria) => getTeeWindowStandingsUseCase.execute(roundId, categoria), [roundId]);
  return <Clasificacion pedir={pedir} userId={userId} activa={activa} cada={CADA} />;
};

export default ClasificacionDeLaFranja;
