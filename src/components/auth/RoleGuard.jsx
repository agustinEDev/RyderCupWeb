import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';

/**
 * RoleGuard Component
 * Route-level guard that verifies user has required global role(s)
 * Redirects to unauthorized page if user doesn't have the required role
 *
 * @param {Object} props
 * @param {string|string[]} props.allowedRoles - Single role or array of allowed roles ('ADMIN', 'CREATOR', 'PLAYER')
 * @param {React.ReactNode} props.children - Protected content to render if authorized
 * @param {boolean} [props.requireAll=false] - If true, requires ALL roles. If false, requires AT LEAST ONE
 * @param {string} [props.redirectTo='/unauthorized'] - Path to redirect when unauthorized
 *
 * @example
 * // Protect admin route
 * <Route path="/admin/users" element={
 *   <RoleGuard allowedRoles="ADMIN">
 *     <AdminUsersPage />
 *   </RoleGuard>
 * } />
 *
 * // Allow ADMIN or CREATOR
 * <Route path="/competitions/create" element={
 *   <RoleGuard allowedRoles={['ADMIN', 'CREATOR']}>
 *     <CreateCompetition />
 *   </RoleGuard>
 * } />
 */
const RoleGuard = ({
  allowedRoles,
  children,
  requireAll = false,
  redirectTo = '/unauthorized',
}) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        color: '#6b7280'
      }}>
        Loading...
      </div>
    );
  }

  // If no user, redirect to login (this shouldn't happen if ProtectedRoute is also used)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Normalize allowedRoles to array
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // Validate that allowedRoles is not empty
  if (rolesArray.length === 0) {
    console.error('[RoleGuard] allowedRoles cannot be empty');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Extract user's role names
  // Support multiple backend formats (RBAC simplified - see ROADMAP.md):
  // 1. user.is_admin = true (current backend format for global admin access)
  // 2. user.roles = [{ name: 'ADMIN' }] or ['ADMIN'] (future format)
  let userRoleNames = [];

  // Check for global admin flag (current backend implementation)
  if (user.is_admin === true) {
    userRoleNames.push('ADMIN');
  }

  // Check for roles array (future implementation)
  if (user.roles && Array.isArray(user.roles)) {
    const rolesFromArray = user.roles.map(role =>
      typeof role === 'string' ? role : role.name
    );
    userRoleNames = [...new Set([...userRoleNames, ...rolesFromArray])];
  }

  // Check if user has required role(s)
  const hasAccess = requireAll
    ? rolesArray.every(role => userRoleNames.includes(role))
    : rolesArray.some(role => userRoleNames.includes(role));

  // Special case: ADMIN has access to everything
  const isAdmin = userRoleNames.includes('ADMIN');

  // CREATOR can access PLAYER routes (as mentioned in CLAUDE.md)
  const isCreator = userRoleNames.includes('CREATOR');
  const playerAccessGranted = rolesArray.includes('PLAYER') && (isCreator || isAdmin);

  if (!hasAccess && !isAdmin && !playerAccessGranted) {
    console.warn(
      `[RoleGuard] Access denied. Required: ${rolesArray.join(', ')}, User has: ${userRoleNames.join(', ')}`
    );
    return <Navigate to={redirectTo} state={{ from: location, reason: 'insufficient_permissions' }} replace />;
  }

  return children;
};

RoleGuard.propTypes = {
  allowedRoles: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string)
  ]).isRequired,
  children: PropTypes.node.isRequired,
  requireAll: PropTypes.bool,
  redirectTo: PropTypes.string,
};

export default RoleGuard;
