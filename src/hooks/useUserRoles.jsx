import { useState, useEffect } from 'react';
import { getUserRolesUseCase } from '../composition';

/**
 * Hook para obtener los roles de un usuario en una competición específica
 * Consume el endpoint GET /api/v1/users/me/roles/{competitionId}
 *
 * @param {string} competitionId - ID de la competición
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
 * const { isAdmin, isCreator, isLoading } = useUserRoles(competitionId);
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
export const useUserRoles = (competitionId) => {
  const [roles, setRoles] = useState({
    isAdmin: false,
    isCreator: false,
    isPlayer: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = async () => {
    if (!competitionId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getUserRolesUseCase.execute(competitionId);
      setRoles({
        isAdmin: data.isAdmin,
        isCreator: data.isCreator,
        isPlayer: data.isPlayer,
      });
    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError(err);
      // En caso de error, resetear roles a false por seguridad
      setRoles({
        isAdmin: false,
        isCreator: false,
        isPlayer: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  return {
    ...roles,
    isLoading,
    error,
    refetch: fetchRoles,
  };
};
