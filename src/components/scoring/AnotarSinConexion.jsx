import { usePublicarAnotacionSinConexion } from '../../hooks/useAnotacionSinConexion';

/**
 * Anotar sin red: no pinta nada, se lo cuenta al aviso de arriba para que
 * salga uno solo (2.ª pasada del QA, 12 oct 2026).
 */
const AnotarSinConexion = ({ pendingCount = 0 }) => {
  usePublicarAnotacionSinConexion(pendingCount);
  return null;
};

export default AnotarSinConexion;
