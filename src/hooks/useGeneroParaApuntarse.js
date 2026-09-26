import { useAuth } from './useAuth';
import { updateUserProfileUseCase } from '../composition';

/**
 * El género para apuntarse a una competición (#710, 24 sep).
 *
 * Las barras de salida se valoran por género, así que el servidor lo exige al
 * pedir plaza, aceptar una invitación o crear una competición. Se pregunta solo
 * a quien no lo tiene, en el momento, y se guarda en su perfil.
 *
 * La sesión se refresca aparte y AL TERMINAR la operación: refrescarla crea un
 * `user` nuevo, y las páginas que dependen de él se recargaban en mitad de
 * pedir plaza o aceptar (revisión local de la #710).
 *
 * @returns {{
 *   falta: boolean,
 *   guardar: (genero: string|null) => Promise<void>,
 *   refrescar: () => Promise<void>,
 * }}
 */
export const useGeneroParaApuntarse = () => {
  const { user, refetch } = useAuth();

  const guardar = async (genero) => {
    if (!genero || !user?.id) return;
    await updateUserProfileUseCase.execute(user.id, { gender: genero });
  };

  // Para que no se le vuelva a preguntar
  const refrescar = () => refetch();

  return { falta: Boolean(user) && !user.gender, guardar, refrescar };
};

export default useGeneroParaApuntarse;
