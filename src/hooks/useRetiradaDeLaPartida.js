import { useState } from 'react';
import { retireFromTeeGroupUseCase } from '../composition';
import customToast from '../utils/toast';
import { mensajeDeErrorDePartida } from '../utils/erroresDePartida';

/**
 * Retirarse de una partida de stroke play: la confirmación, el caso de uso y
 * su toast. Tras retirarse se vuelve a pedir la vista (`refetch`).
 */
export const useRetiradaDeLaPartida = ({ groupId, t, refetch }) => {
  const [retirandose, setRetirandose] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const retirarse = async () => {
    setOcupado(true);
    try {
      await retireFromTeeGroupUseCase.execute(groupId);
      setRetirandose(false);
      customToast.success(t('partida.retired'));
      await refetch();
    } catch (err) {
      customToast.error(mensajeDeErrorDePartida(t, err));
      // La confirmación no se queda abierta tras el error (revisor)
      setRetirandose(false);
    } finally {
      setOcupado(false);
    }
  };

  return {
    retirandose,
    ocupado,
    retirarse,
    pedirRetirada: () => setRetirandose(true),
    cancelarRetirada: () => setRetirandose(false),
  };
};
