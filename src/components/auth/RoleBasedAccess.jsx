import PropTypes from 'prop-types';
import { useUserRoles } from '../../hooks/useUserRoles';

/**
 * Componente wrapper para renderizar condicionalmente contenido basado en roles de usuario
 * Utiliza el hook useUserRoles internamente
 *
 * @component
 * @param {Object} props
 * @param {string} props.competitionId - ID de la competición
 * @param {string[]} props.allowedRoles - Array de roles permitidos: ['ADMIN', 'CREATOR', 'PLAYER']
 * @param {React.ReactNode} props.children - Contenido a renderizar si el usuario tiene alguno de los roles permitidos
 * @param {React.ReactNode} [props.fallback=null] - Contenido a renderizar si el usuario no tiene permisos
 * @param {boolean} [props.requireAll=false] - Si es true, requiere TODOS los roles. Si es false, requiere AL MENOS UNO
 *
 * @example
 * ```jsx
 * // Mostrar solo a Creators o Admins
 * <RoleBasedAccess
 *   competitionId={competitionId}
 *   allowedRoles={['CREATOR', 'ADMIN']}
 * >
 *   <Button>Editar Competición</Button>
 * </RoleBasedAccess>
 *
 * // Mostrar solo a Admins
 * <RoleBasedAccess
 *   competitionId={competitionId}
 *   allowedRoles={['ADMIN']}
 *   fallback={<p>Solo administradores</p>}
 * >
 *   <AdminPanel />
 * </RoleBasedAccess>
 *
 * // Requiere ser Creator Y Admin (ambos roles)
 * <RoleBasedAccess
 *   competitionId={competitionId}
 *   allowedRoles={['ADMIN', 'CREATOR']}
 *   requireAll={true}
 * >
 *   <SuperAdminPanel />
 * </RoleBasedAccess>
 * ```
 */
const RoleBasedAccess = ({
  competitionId,
  allowedRoles,
  children,
  fallback = null,
  requireAll = false,
}) => {
  const { isAdmin, isCreator, isPlayer, isLoading } = useUserRoles(competitionId);

  // Mientras carga, no mostrar nada (evita flash de contenido no autorizado)
  if (isLoading) {
    return null;
  }

  // Guard: deny access when allowedRoles is missing or empty
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    console.error('[RoleBasedAccess] allowedRoles is required and cannot be empty');
    return fallback;
  }

  // Mapeo de roles a valores booleanos
  const userRoles = {
    ADMIN: isAdmin,
    CREATOR: isCreator,
    PLAYER: isPlayer,
  };

  // Verificar permisos
  const hasAccess = requireAll
    ? allowedRoles.every((role) => userRoles[role])
    : allowedRoles.some((role) => userRoles[role]);

  return hasAccess ? children : fallback;
};

RoleBasedAccess.propTypes = {
  competitionId: PropTypes.string.isRequired,
  allowedRoles: PropTypes.arrayOf(
    PropTypes.oneOf(['ADMIN', 'CREATOR', 'PLAYER'])
  ).isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  requireAll: PropTypes.bool,
};

export default RoleBasedAccess;
