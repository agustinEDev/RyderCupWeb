import { useCallback, useState } from 'react';
import { getUserRolesUseCase } from '../composition';
import { useCargaCancelableEffect } from './useCargaCancelableEffect';

// Sin saber los roles, ninguno: también ante cualquier error, por seguridad
const SIN_ROLES = Object.freeze({ isAdmin: false, isCreator: false, isPlayer: false });

/**
 * Hook para obtener los roles de un usuario en una competición específica
 * Consume el endpoint GET /api/v1/users/me/roles/{competitionId}
 *
 * Los roles son de un usuario en una competición: lo leído (o el error) para
 * otra competición u otro usuario nunca se devuelve. Mientras no llegan los
 * del par actual, los tres a false y esperando, ya desde el pintado del cambio
 * (con atrás/adelante entre dos fichas la página no se desmonta, y la
 * respuesta de la anterior podía pintar sus roles en la nueva: A01).
 *
 * @param {string} competitionId - ID de la competición
 * @param {string} [userId] - Quién mira: al cambiar, se vuelve a pedir; sin
 *   él no se pide (los tres a false y esperando)
 * @returns {{
 *   isAdmin: boolean,
 *   isCreator: boolean,
 *   isPlayer: boolean,
 *   isLoading: boolean,
 *   error: Error|null,
 *   refetch: Function
 * }}
 *
 * @example
 * ```jsx
 * const { isAdmin, isCreator, isLoading } = useUserRoles(competitionId, user?.id);
 *
 * if (isLoading) return <Spinner />;
 *
 * return (
 *   <div>
 *     {isCreator && <Button>Editar Competición</Button>}
 *     {isAdmin && <Button>Gestionar Usuarios</Button>}
 *   </div>
 * );
 * ```
 */
export const useUserRoles = (competitionId, userId) => {
  // Lo último leído, con el usuario y la competición para los que se pidió
  const [leido, setLeido] = useState({ usuario: undefined, competicion: undefined, roles: SIN_ROLES, error: null });

  const { cargando, recargar } = useCargaCancelableEffect(
    () => {
      // Se apunta para quién se pidió AL PEDIR, no al llegar
      const para = { usuario: userId, competicion: competitionId };
      return (async () => getUserRolesUseCase.execute(competitionId))()
        .then((data) => ({
          ...para,
          roles: { isAdmin: data.isAdmin, isCreator: data.isCreator, isPlayer: data.isPlayer },
          error: null,
        }))
        .catch((error) => ({ ...para, roles: SIN_ROLES, error }));
    },
    [competitionId, userId],
    {
      // Sin usuario aún no se pide: pedir y volver a pedir al llegar hacía
      // parpadear los controles de organizador
      activa: Boolean(competitionId && userId),
      alCargar: (deLaPeticion) => {
        if (deLaPeticion.error) console.error('Error fetching user roles:', deLaPeticion.error);
        setLeido(deLaPeticion);
      },
    }
  );

  // Solo vale lo leído para este usuario y esta competición
  const vigente = leido.usuario === userId && leido.competicion === competitionId;
  const roles = vigente ? leido.roles : SIN_ROLES;

  // Volver a pedir quita el error y enseña la espera al momento; no pasa el
  // evento del botón que lo llama. No devuelve la promesa de `recargar()`: esa
  // se cumple tras el efecto, y quien la esperase dentro de un `act` no lo
  // dejaría correr nunca (como antes, quien quiera el resultado mira el estado)
  const refetch = useCallback(() => {
    setLeido((antes) => ({ ...antes, error: null }));
    recargar();
  }, [recargar]);

  return {
    ...roles,
    // Sin usuario (la sesión aún se está leyendo) se espera, como las
    // pantallas, que enseñan la espera mientras tanto: no se ha leído nada para
    // él, así que no hay nada vigente. Sin competición, no se espera (P5)
    isLoading: Boolean(competitionId) && (cargando || !vigente),
    error: vigente ? leido.error : null,
    refetch,
  };
};
